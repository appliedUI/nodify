<template>
  <div class="flex flex-col items-center">
    <button
      class="hover:opacity-80 transition-opacity"
      :class="{
        'opacity-40 cursor-not-allowed tooltip': !isRecordEnabled,
        'active ring-2 ring-red-500': isRecording,
      }"
      @click="toggleRecording"
      :data-tip="tooltipMessage"
      :disabled="!isRecordEnabled"
    >
      <img
        :src="isRecording ? stopBtnSvg : recordBtnSvg"
        alt="Record"
        class="w-[130px] h-[130px] mt-2"
      />
    </button>

    <!-- Overlay with RecordRing -->
    <div
      v-if="showOverlay"
      class="fixed inset-0 z-[9999] backdrop-blur-md bg-black/50"
    >
      <div
        class="absolute inset-0 flex flex-col items-center justify-center gap-4"
      >
        <RecordRing
          ref="recordRing"
          @close="handleOverlayClose"
          @start-recording="handleOverlayRecordingStart"
          @stop-recording="handleOverlayRecordingStop"
        />
        <p class="text-white/80 text-md font-nunito mt-4">
          <strong>Spacebar</strong> to toggle recording. <strong>ESC</strong> to
          cancel.
        </p>
      </div>
    </div>

    <!-- API Key Modal -->
    <dialog
      :class="{ 'modal modal-open': showApiKeyModal }"
      class="modal z-[9999]"
    >
      <div class="modal-box">
        <h3 class="font-bold text-lg">OpenAI API Key Required</h3>
        <p class="py-4">
          To use the recording feature, you need to add your OpenAI API key.
        </p>
        <div class="modal-action">
          <button class="btn btn-primary" @click="goToApiKeys">
            Add API Key
          </button>
          <button class="btn" @click="showApiKeyModal = false">Cancel</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showApiKeyModal = false">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import mindmapData from '../../workspace/mindmapData.json' // Added import
import { useSubjectsStore } from '@/stores/subjectsStore'
import { db } from '@/db/db'
import { callOpenAIWithSimplePrompt } from '@/ai/controllers/openai'
import recordBtnSvg from '@/assets/img/recordBtn.svg'
import stopBtnSvg from '@/assets/img/stopBtn.svg'
import { toast } from 'vue3-toastify'
import { useAudioStore } from '@/stores/audioStore' // Update import name
import { useGraphForceStore } from '@/stores/graphForceStore'
import RecordRing from '@/modules/onboard/RecordRing/RecordRing.vue'

const subjectsStore = useSubjectsStore()
const audioStore = useAudioStore() // Update store initialization
const graphForceStore = useGraphForceStore()
const isRecording = ref(false)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const transcription = ref('')
const error = ref('')
const isProcessing = ref(false)
const showOverlay = ref(false)

//add router
import { useRouter } from 'vue-router'
const router = useRouter()

// Add new ref for modal
const showApiKeyModal = ref(false)

// Add navigation function
const goToApiKeys = () => {
  //use rotuer for apikeys
  router.push('/apikeys')
}

// Add function to check if API key exists
const hasApiKey = () => {
  return !!localStorage.getItem('openai_key')
}

// Update record enabled state when subject changes
const isRecordEnabled = computed(() => {
  const hasSelectedSubject = !!subjectsStore.selectedSubjectId
  const hasSubjects = subjectsStore.subjects.length > 0
  const currentSubject = subjectsStore.currentSubject

  return hasSelectedSubject && hasSubjects && currentSubject
})

const tooltipMessage = computed(() => {
  if (subjectsStore.subjects.length === 0) {
    return 'Please create a subject'
  }
  if (!subjectsStore.selectedSubjectId) {
    return 'Please select a subject'
  }
  return ''
})

const toggleRecording = async () => {
  try {
    if (isRecording.value) {
      stopRecording()
      showOverlay.value = false
      return
    }

    if (!hasApiKey()) {
      showApiKeyModal.value = true
      return
    }

    showOverlay.value = true
  } catch (error) {
    console.error('Error in toggleRecording:', error)
    showOverlay.value = false
    isRecording.value = false
    toast.error('Recording failed to start')
  }
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream)
    audioChunks.value = []

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }

    mediaRecorder.value.onstop = async () => {
      const audioBlob = new Blob(audioChunks.value, { type: 'audio/wav' })
      const arrayBuffer = await audioBlob.arrayBuffer()
      await sendAudioToWhisper(arrayBuffer)
    }

    mediaRecorder.value.start()
    isRecording.value = true
  } catch (error) {
    console.error('Error accessing microphone:', error)
    toast.error('Error accessing microphone')
    showOverlay.value = false
  }
}

const stopRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
    mediaRecorder.value.stop()
    const tracks = mediaRecorder.value.stream.getTracks()
    tracks.forEach((track) => track.stop())
  }
  isRecording.value = false
}

const sendAudioToWhisper = async (arrayBuffer) => {
  error.value = ''
  isProcessing.value = true
  audioStore.updateProcessingProgress({ isComplete: false })

  try {
    console.log('🎤 Sending audio for transcription...')

    // Get the encrypted API key
    const encryptedApiKey = localStorage.getItem('openai_key')

    // Send the audio buffer and encrypted API key
    const response = await window.electronAPI.transcribeAudio(
      arrayBuffer,
      encryptedApiKey
    )
    console.log('✨ Received transcription:', response)

    // Save transcript
    await audioStore.handleTranscriptReceived(response)

    // Generate and update graph with OpenAI
    const selectedSubject = subjectsStore.selectedSubjectId
    if (selectedSubject) {
      const graphData = await graphForceStore.generateGraphWithOpenAI(response)
      console.log('Graph updated with OpenAI:', graphData)
    } else {
      console.warn('No subject selected for graph update')
    }

    toast('Transcription completed and graph updated', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      autoClose: 500,
      transition: 'slide',
    })
  } catch (err) {
    console.error('❌ Error processing audio:', err)
    error.value = 'Failed to process audio. Please check your OpenAI API key.'
    showApiKeyModal.value = true
  } finally {
    isProcessing.value = false
    audioStore.updateProcessingProgress({ isComplete: true })
  }
}

// Add new method to handle overlay close
const handleOverlayClose = () => {
  showOverlay.value = false
  // If recording was in progress, stop it
  if (isRecording.value) {
    stopRecording()
  }
}

// Add new handler for when recording starts from overlay
const handleOverlayRecordingStart = () => {
  startRecording()
}

// Add new handler for when recording stops from overlay
const handleOverlayRecordingStop = () => {
  stopRecording()
}

// Add lifecycle hooks for event listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// Update keydown handler with proper event handling
const handleKeyDown = (e) => {
  // Only handle events when overlay is shown
  if (!showOverlay.value) return

  // Ignore if the event is coming from a textarea or input
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
    return
  }

  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    toggleRecording()
  } else if (e.code === 'Escape') {
    handleOverlayClose()
  }
}
</script>

<style scoped>
.active {
}
</style>
