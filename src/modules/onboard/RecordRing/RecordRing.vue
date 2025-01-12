<template>
  <div class="file-upload -mt-10">
    <input
      type="file"
      id="file-upload-input"
      accept=".mp4, .wav, .mp3, .m4a, .aac"
      @change="handleFileUpload"
      class="file-input"
    />
    <small>Select or drag and drop files. ( .mp3 .m4a .wav supported ) </small>
    <label for="file-upload-input" class="btn btn-secondary btn-md mt-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
    </label>
    <div v-if="isUploading" class="mt-2 text-white">
      Processing audio file...
    </div>
  </div>
  <div
    class="close cursor-pointer absolute top-[50px] left-1/2 transform -translate-x-1/2"
    @click="handleClose"
  >
    <img
      src="@/assets/img/close.svg"
      alt="Close"
      class="hover-scale red-hover h-[24px] w-[24px]"
    />
  </div>
  <div
    class="visualizer-container"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop.prevent="handleDrop"
    :class="{ 'drag-active': isDragging }"
  >
    <canvas ref="canvas" class="visualizer"></canvas>
    <div class="flex flex-col items-center gap-4 mt-3">
      <p v-if="!isRecording" class="text-white/50 text-sm mt-6">
        Waiting for your voice...
      </p>
      <div class="fixed bottom-[80px]">
        <button
          class="btn btn-error mt-4"
          @click="handleStartRecording"
          :disabled="isRecording"
        >
          Record
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAudioStore } from '@/stores/audioStore'
import { useGraphForceStore } from '@/stores/graphForceStore'
import { toast } from 'vue3-toastify'

// Add store initializations
const audioStore = useAudioStore()
const graphForceStore = useGraphForceStore()

const canvas = ref(null)
const audioContext = ref(null)
const analyser = ref(null)
const dataArray = ref(null)
const isRunning = ref(true)
const animationFrame = ref(null)

// Add easing function at the top of script
const easeOutQuad = (t) => t * (2 - t)
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

// Add animation state variables
const targetRingRadius = ref(0)
const currentRingRadius = ref(0)
const targetRingThickness = ref(0)
const currentRingThickness = ref(0)
const animationSpeed = 0.05 // Adjust this for faster/slower animation

// Add new ref for shadow animation
const shadowAnimation = ref(0)

// Add this state variable to track if audio context is closed
const isAudioContextClosed = ref(false)

// Setup canvas
const setupCanvas = () => {
  canvas.value.width = 200
  canvas.value.height = 200
}

// Audio setup
const setupAudio = async () => {
  try {
    // Only create new audio context if it doesn't exist or is closed
    if (!audioContext.value || audioContext.value.state === 'closed') {
      audioContext.value = new (window.AudioContext ||
        window.webkitAudioContext)()
      isAudioContextClosed.value = false
    }

    analyser.value = audioContext.value.createAnalyser()
    analyser.value.fftSize = 512
    dataArray.value = new Uint8Array(analyser.value.frequencyBinCount)

    mediaStream.value = await navigator.mediaDevices.getUserMedia({
      audio: true,
    })
    const source = audioContext.value.createMediaStreamSource(mediaStream.value)
    source.connect(analyser.value)
    isRunning.value = true
    draw()
  } catch (error) {
    console.error('Error setting up audio:', error)
    isRunning.value = false
  }
}

// Draw function
const draw = () => {
  if (!isRunning.value) return

  const ctx = canvas.value.getContext('2d')
  analyser.value.getByteFrequencyData(dataArray.value)

  // Clear canvas
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  // Update shadow animation
  shadowAnimation.value = (shadowAnimation.value + 0.01) % (Math.PI * 2)

  // Calculate average frequency
  const avgFreq =
    dataArray.value.reduce((a, b) => a + b, 0) / dataArray.value.length

  // Dynamic ring properties with easing
  const centerX = canvas.value.width / 2
  const centerY = canvas.value.height / 2
  const baseRadius = Math.min(canvas.value.width, canvas.value.height) * 0.3

  // Set target values
  targetRingRadius.value = baseRadius + (avgFreq / 555) * 100
  targetRingThickness.value = 10 + (avgFreq / 555) * 150

  // Apply easing to current values
  currentRingRadius.value +=
    (targetRingRadius.value - currentRingRadius.value) * animationSpeed
  currentRingThickness.value +=
    (targetRingThickness.value - currentRingThickness.value) * animationSpeed

  // Draw white ring when not recording
  if (!isRecording.value) {
    // Calculate oscillating shadow intensity
    const shadowIntensity = 10 + Math.sin(shadowAnimation.value) * 5

    // Draw main ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, currentRingRadius.value, 0, Math.PI * 2)
    ctx.lineWidth = currentRingThickness.value
    ctx.strokeStyle = '#fff'
    ctx.shadowBlur = shadowIntensity
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
    ctx.stroke()

    animationFrame.value = requestAnimationFrame(draw)
    return
  }

  // Only apply colorful effects when recording
  const progress = easeInOutQuad(
    Math.min(1, (currentRingRadius.value - baseRadius) / 100)
  )
  const rotation = (performance.now() / 1000) * (0.5 + progress * 0.5)

  // Create gradient with eased color transitions
  const gradient = ctx.createConicGradient(rotation, centerX, centerY)
  gradient.addColorStop(
    0,
    `hsl(${(avgFreq / 255) * 360}, 100%, ${50 + progress * 20}%)`
  )
  gradient.addColorStop(
    0.5,
    `hsl(${((avgFreq + 80) / 255) * 360}, 100%, ${50 + progress * 20}%)`
  )
  gradient.addColorStop(
    1,
    `hsl(${(avgFreq / 255) * 360}, 100%, ${50 + progress * 20}%)`
  )

  // Draw main ring with eased properties
  ctx.beginPath()
  ctx.arc(centerX, centerY, currentRingRadius.value, 0, Math.PI * 2)
  ctx.lineWidth = currentRingThickness.value
  ctx.strokeStyle = gradient
  ctx.shadowBlur = (currentRingThickness.value / 2) * progress
  ctx.shadowColor = `hsl(${(avgFreq / 255) * 360}, 100%, 50%)`
  ctx.stroke()

  // Draw inner glow with eased properties
  ctx.beginPath()
  ctx.arc(
    centerX,
    centerY,
    currentRingRadius.value - currentRingThickness.value / 2,
    0,
    Math.PI * 2
  )
  ctx.lineWidth = (currentRingThickness.value / 4) * progress
  ctx.strokeStyle = `hsla(${(avgFreq / 255) * 360}, 100%, 50%, ${
    0.3 * progress
  })`
  ctx.stroke()

  // Draw outer glow with eased properties
  ctx.beginPath()
  ctx.arc(
    centerX,
    centerY,
    currentRingRadius.value + currentRingThickness.value / 2,
    0,
    Math.PI * 2
  )
  ctx.lineWidth = (currentRingThickness.value / 4) * progress
  ctx.strokeStyle = `hsla(${(avgFreq / 255) * 360}, 100%, 50%, ${
    0.3 * progress
  })`
  ctx.stroke()

  animationFrame.value = requestAnimationFrame(draw)
}

// Lifecycle hooks
onMounted(async () => {
  setupCanvas()
  window.addEventListener('resize', setupCanvas)
  await setupAudio()
  // Add keydown listener
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  cleanupResources()
  window.removeEventListener('resize', setupCanvas)
  window.removeEventListener('keydown', handleKeyDown)
})

// Add emits
const emit = defineEmits([
  'close',
  'start-recording',
  'stop-recording',
  'file-uploaded',
])

// Add recording state
const isRecording = ref(false)

// Add upload state
const isUploading = ref(false)

// Add drag and drop state
const isDragging = ref(false)

// Add drag and drop handlers
const handleDragEnter = (e) => {
  isDragging.value = true
}

const handleDragLeave = (e) => {
  // Only set isDragging to false if we're leaving the main container
  const rect = e.currentTarget.getBoundingClientRect()
  if (
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom
  ) {
    return
  }
  isDragging.value = false
}

const handleDrop = async (e) => {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return

  // Check file type
  const validTypes = ['.mp4', '.wav', '.mp3', '.m4a', '.aac']
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
  if (!validTypes.includes(fileExtension)) {
    toast.error('Invalid file type. Please upload an audio file.')
    return
  }

  try {
    isUploading.value = true
    const reader = new FileReader()

    reader.onload = async () => {
      const arrayBuffer = reader.result
      emit('file-uploaded', arrayBuffer)
      handleClose()
      await audioStore.sendAudioToWhisper(arrayBuffer)
    }

    reader.onerror = () => {
      toast.error('Failed to read the file.')
    }

    reader.readAsArrayBuffer(file)
  } catch (error) {
    toast.error(error.message)
  } finally {
    isUploading.value = false
  }
}

const handleStartRecording = () => {
  isRecording.value = true
  emit('start-recording')
}

const handleClose = () => {
  // Only allow closing if not recording
  if (isRecording.value) {
    return
  }

  // Clean up resources
  cleanupResources()
  emit('close')
}

const cleanupResources = () => {
  // Clean up audio context if it exists and isn't already closed
  if (audioContext.value && !isAudioContextClosed.value) {
    try {
      audioContext.value
        .close()
        .then(() => {
          console.log('AudioContext successfully closed')
          isAudioContextClosed.value = true
        })
        .catch((error) => {
          console.error('Error closing AudioContext:', error)
        })
    } catch (error) {
      console.error('Error in audio context cleanup:', error)
    }
  }

  // Clean up media stream
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop())
  }

  // Clean up animation
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
}

// Modify keydown handler to prevent spacebar from starting recording
const handleKeyDown = (e) => {
  // Ignore if the event is coming from a textarea or input
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
    return
  }

  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault()
    if (!isRecording.value) {
      handleStartRecording()
    } else {
      emit('stop-recording')
      handleClose()
    }
  } else if (e.code === 'Escape') {
    e.preventDefault()
    handleClose()
  }
}

// Add mediaStream ref
const mediaStream = ref(null)

// Update the handleFileUpload function
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    isUploading.value = true
    const reader = new FileReader()

    reader.onload = async () => {
      const arrayBuffer = reader.result

      emit('file-uploaded', arrayBuffer) // Keep the emit for parent component

      // Close overlay first
      handleClose()

      // Process the audio file through audioStore
      await audioStore.sendAudioToWhisper(arrayBuffer)
    }

    reader.onerror = () => {
      emit('upload-error', 'Failed to read the file.')
    }

    reader.readAsArrayBuffer(file)
  } catch (error) {
    emit('upload-error', error.message)
  } finally {
    isUploading.value = false
  }
}
</script>

<style scoped>
.visualizer-container {
  width: 400px;
  height: 400px;
  margin: 0 auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.visualizer {
  width: 100%;
  height: 100%;
  border-radius: 50%;

  box-shadow: 0 0 20px rgba(0, 0, 0, 0);
}

.control-button {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  font-size: 16px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  z-index: 100;
}

.control-button:hover {
  background-color: #45a049;
}

.close {
  z-index: 1000;
  width: 24px;
  height: 24px;
}

.hover-scale {
  transition: transform 0.2s ease;
}

.hover-scale:hover {
  transform: scale(1.1);
}

.red-hover:hover {
  filter: brightness(0.8) sepia(1) hue-rotate(-50deg) saturate(5);
}

.file-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative; /* Ensure proper positioning */
  z-index: 10; /* Adjust z-index to be above other elements */
}

.file-input {
  display: none;
}

.file-upload label {
  cursor: pointer;
  z-index: 11; /* Ensure label is above the input */
  position: relative;
}

/* Optional: Ensure no other elements overlap the upload button */
.close {
  z-index: 12; /* Higher z-index if needed */
}

/* Add loading state styles */
.uploading {
  opacity: 0.7;
  cursor: not-allowed;
}

.drag-active {
  position: relative;
}

.drag-active::after {
  content: 'Drop audio file here';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.7);
  pointer-events: none;
  z-index: 20;
}

/* Remove the previously added overlay styles */
.overlay-container {
  display: none;
}
</style>
