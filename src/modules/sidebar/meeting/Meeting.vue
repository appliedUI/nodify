<template>
  <div class="flex flex-col items-center pt-5">
    <!-- Meeting URL input -->
    <div>
      <textarea
        v-model="meetingUrl"
        class="textarea textarea-bordered h-14 bg-base-200 text-xs w-[190px]"
        placeholder="Paste meeting URL here"
        wrap="soft"
        :disabled="isRecording"
      ></textarea>
    </div>

    <!-- Control buttons -->
    <div class="flex gap-3 mt-2 -mb-[6px]">
      <button
        class="btn btn-primary btn-sm"
        @click="openMeeting"
        :disabled="!meetingUrl || isRecording"
      >
        Join
      </button>

      <button
        class="btn btn-secondary btn-sm"
        :class="{ 'btn-error': isRecording }"
        @click="toggleRecording"
        :disabled="!meetingUrl"
      >
        {{ isRecording ? 'Stop ' : 'Start ' }}
      </button>
    </div>

    <!-- Status messages -->
    <div class="mt-2 text-xs">
      <p v-if="error" class="text-error">{{ error }}</p>
      <p v-if="isRecording" class="flex items-center gap-2">
        <span class="w-2 h-2 bg-error rounded-full animate-pulse"></span>
        <span class="text-success">Recording system audio...</span>
      </p>
      <p v-if="lastRecordingPath" class="text-info text-xs mt-1">
        Recording saved! Click to open:
        <a
          @click="openRecording"
          class="text-primary hover:underline cursor-pointer"
        >
          {{ getFileName(lastRecordingPath) }}
        </a>
      </p>
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
        @close="handleClose"
        @start-recording="handleOverlayRecordingStart"
        @stop-recording="handleOverlayRecordingStop"
        @file-uploaded="handleFileUploaded"
        @upload-error="handleUploadError"
      ></RecordRing>
      <p class="text-white/80 text-md font-nunito mt-4">
        <strong>Spacebar</strong> to toggle recording. <strong>ESC</strong> to
        cancel.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import RecordRing from '@/modules/onboard/RecordRing/RecordRing.vue'
import { useAudioStore } from '@/stores/audioStore'
import { useSubjectsStore } from '@/stores/subjectsStore'
import { useGraphForceStore } from '@/stores/graphForceStore'
import { useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'

// Store initializations
const audioStore = useAudioStore()
const subjectsStore = useSubjectsStore()
const graphForceStore = useGraphForceStore()
const router = useRouter()

// State
const meetingUrl = ref('')
const error = ref('')
const lastRecordingPath = ref('')
const mediaRecorder = ref(null)
const audioChunks = ref([])
const showOverlay = ref(false)
const showApiKeyModal = ref(false)
const isRecording = ref(false)
const isProcessing = ref(false)

// Add computed properties for subject checks
const isRecordEnabled = computed(() => {
  const hasSelectedSubject = !!subjectsStore.selectedSubjectId
  const hasSubjects = subjectsStore.subjects.length > 0
  const currentSubject = subjectsStore.currentSubject
  return hasSelectedSubject && hasSubjects && currentSubject
})

// Add navigation function
const goToApiKeys = () => {
  router.push('/apikeys')
}

// Add API key check
const hasApiKey = () => {
  return !!localStorage.getItem('openai_key')
}

// Helper to get just the filename
function getFileName(path) {
  return path.split('/').pop()
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
  } catch (err) {
    console.error('❌ Error processing audio:', err)
    error.value = 'Failed to process audio. Please check your OpenAI API key.'
    showApiKeyModal.value = true
  } finally {
    isProcessing.value = false
    audioStore.updateProcessingProgress({ isComplete: true })
  }
}

// Open the recording in system file explorer
function openRecording() {
  if (lastRecordingPath.value) {
    window.electron.ipcRenderer.send('show-in-folder', lastRecordingPath.value)
  }
}

// Open meeting in default browser
function openMeeting() {
  if (!meetingUrl.value) {
    error.value = 'Please enter a meeting URL'
    return
  }
  error.value = ''
  window.electron.ipcRenderer.send('join-meeting', meetingUrl.value)
}

// Toggle recording state
function toggleRecording() {
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
    handleClose()
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

// Add the handleClose function
const handleClose = () => {
  // Only allow closing if not recording
  if (isRecording.value) {
    return
  }
  showOverlay.value = false
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
    audioStore.setAudioRecording(true)
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
  audioStore.setAudioRecording(false)
}

// Handle FFmpeg completion
function handleRecordingComplete(
  event: any,
  { outputPath, error: recordingError }: { outputPath?: string; error?: string }
) {
  console.log('Recording complete callback:', {
    outputPath,
    error: recordingError,
  })
  if (recordingError) {
    console.error('Recording error:', recordingError)
    error.value = recordingError
    isRecording.value = false
    return
  }

  if (outputPath) {
    console.log('Recording saved to:', outputPath)
    lastRecordingPath.value = outputPath

    // Verify file exists
    window.electron.ipcRenderer.send('verify-file-exists', outputPath)
  }
}

// Add file verification handler
window.electron.ipcRenderer.on('file-verified', (event, { exists, size }) => {
  if (exists) {
    console.log('File verified, size:', size)
  } else {
    console.error('File verification failed')
    error.value = 'File verification failed'
  }
})

// Add the handleFileUploaded function
const handleFileUploaded = async (arrayBuffer) => {
  showOverlay.value = false // Close overlay immediately

  try {
    // Process the audio through audioStore
    await audioStore.sendAudioToWhisper(arrayBuffer)
  } catch (err) {
    toast.error('Failed to process audio file', {
      theme: 'auto',
      position: 'top-center',
      autoClose: 5000,
    })
    error.value = err.message
  }
}

// Optional: Handle upload errors
const handleUploadError = (errorMessage) => {
  error.value = errorMessage
}

// Lifecycle hooks
onMounted(() => {
  window.electron.ipcRenderer.on('ffmpeg-stopped', handleRecordingComplete)
})

onUnmounted(() => {
  window.electron.ipcRenderer.off('ffmpeg-stopped', handleRecordingComplete)
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
