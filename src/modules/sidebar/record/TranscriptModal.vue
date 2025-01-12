<template>
  <transition
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="pointer-events-none fixed inset-0 z-40">
      <div
        class="pointer-events-auto fixed bg-gray-900 rounded-lg overflow-hidden flex border border-gray-700"
        :style="{
          width: `${panel.width}px`,
          height: `${panel.height}px`,
          left: `${panel.pos.x}px`,
          top: `${panel.pos.y}px`,
        }"
      >
        <!-- Top bar with buttons -->
        <div
          class="absolute top-0 left-0 right-0 h-10 flex justify-between items-center px-4 bg-gray-800/50 border-b border-gray-700 z-50"
          @mousedown="startPanelDrag"
        >
          <!-- Close button -->
          <button
            @click="$emit('close')"
            class="text-gray-300 hover:text-white"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>

          <!-- Video toggle button - always visible when video is available -->
          <button
            v-if="hasYoutubeUrl"
            @click="videoStore.toggleVideo()"
            class="text-gray-300 hover:text-white flex items-center gap-1 text-sm"
          >
            {{ videoStore.showVideo ? 'Hide Video' : 'Show Video' }}
          </button>
        </div>

        <!-- Resize handle -->
        <div
          class="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize z-50 pointer-events-auto"
          @mousedown.stop="startResize"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 18"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4 transform -rotate-45"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 13l-7 7-7-7m14-8l-7 7-7-7"
            />
          </svg>
        </div>

        <!-- Left Panel - Markdown Content -->
        <div
          class="grid"
          :class="
            showSingleColumn
              ? 'grid-cols-1'
              : 'lg:grid-cols-[60%_40%] grid-cols-1'
          "
        >
          <div
            class="h-full overflow-y-auto p-6 mt-10 border-r border-gray-700"
          >
            <div class="markdown-modal" @mouseup="handleTextSelection">
              <div class="relative">
                <div
                  v-if="hasYoutubeUrl && shouldShowVideo"
                  class="w-full mb-4 rounded-lg overflow-hidden"
                >
                  <YouTube
                    :src="videoStore.videoId"
                    :player-vars="playerVars"
                    @ready="onReady"
                    @error="onError"
                    :width="800"
                    :height="450"
                    class="w-full h-full"
                  />
                </div>
              </div>
              <slot></slot>
            </div>
          </div>

          <!-- Right Panel - Raw Transcript -->
          <div
            v-if="!showSingleColumn"
            class="h-full overflow-y-auto p-6 bg-gray-100"
          >
            <div class="prose prose-invert max-w-none">
              <div
                class="text-gray-800 leading-relaxed text-base tracking-normal"
              >
                <div class="font-bold mb-2 mt-7">Full Transcript</div>

                <p>{{ transcript }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Replace old selection menu with new Floating Action Toolbar -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 transform translate-y-4"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 transform translate-y-0"
        leave-to-class="opacity-0 transform translate-y-4"
      >
        <div
          v-if="showSelectionMenu"
          class="pointer-events-auto fixed bottom-[30px] left-1/2 transform -translate-x-1/2 bg-secondary rounded-md shadow-lg px-3 py-2 flex items-center gap-3 z-[60]"
        >
          <button
            @click.stop="sendToNotes"
            @mousedown.stop
            class="text-gray-200 hover:text-white transition-colors duration-150 flex items-center gap-1 p-1"
            title="Send to Notes"
          >
            <DocumentTextIcon class="w-5 h-5" />
          </button>
          <div class="w-px h-5 bg-gray-600"></div>
          <button
            @click.stop="copyText"
            @mousedown.stop
            class="text-gray-200 hover:text-white transition-colors duration-150 flex items-center gap-1 p-1"
            title="Copy to Clipboard"
          >
            <ClipboardDocumentIcon class="w-5 h-5" />
          </button>
        </div>
      </Transition>
    </div>
  </transition>
</template>
<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useVideoStore } from '@/stores/videoStore'
import { useSubjectsStore } from '@/stores/subjectsStore'
import { db } from '@/db/db'
import YouTube from 'vue3-youtube'
import {
  XMarkIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
} from '@heroicons/vue/24/outline'
import { useNotesStore } from '@/stores/notesStore'

const videoStore = useVideoStore()
const subjectsStore = useSubjectsStore()
const notesStore = useNotesStore()
const hasYoutubeUrl = computed(() => {
  return !!videoStore.videoUrl
})

onMounted(async () => {
  const currentSubject = subjectsStore.currentSubject
  if (currentSubject) {
    const url = await db.getSubjectYoutubeUrl(currentSubject.id)
    hasYoutubeUrl.value = !!url
  }
})

// Update watch to use new method
watch(
  () => subjectsStore.currentSubject,
  async (newSubject) => {
    if (newSubject) {
      const url = await db.getSubjectYoutubeUrl(newSubject.id)
      hasYoutubeUrl.value = !!url
    } else {
      hasYoutubeUrl.value = false
    }
  }
)

const shouldShowVideo = computed(() => {
  return hasYoutubeUrl.value && videoStore.showVideo && videoStore.videoId
})

const panel = ref({
  width: 800,
  height: 600,
  pos: { x: 100, y: 100 },
})

const playerVars = {
  autoplay: 0,
  modestbranding: 1,
  rel: 0,
  origin: window.location.origin,
  enablejsapi: 1,
  playsinline: 1,
}

const onReady = (event) => {
  console.log('YouTube Player Ready:', event)
}

const onError = (error) => {
  console.error('YouTube player error:', error)
  // Log more details about the error
  if (error?.data) {
    const errorCodes = {
      2: 'Invalid parameter',
      5: 'HTML5 player error',
      100: 'Video not found',
      101: 'Playback not allowed',
      150: 'Playback not allowed',
    }
    console.log(
      'Error code:',
      error.data,
      errorCodes[error.data] || 'Unknown error'
    )
  }
}

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  transcript: {
    type: String,
    required: true,
  },
})

defineEmits(['close'])

const subjectId = ref(null)
const isLoading = ref(false)

onMounted(async () => {
  const id = localStorage.getItem('selectedSubjectId')
  console.log('Modal mounted, selectedSubjectId:', id) // Debugging

  if (id) {
    subjectId.value = id
    console.log('Fetching video URL for subject:', id) // Debugging
    isLoading.value = true
    try {
      await videoStore.getVideoUrl(id)
    } catch (error) {
      console.error('Error fetching video URL:', error)
    } finally {
      isLoading.value = false
    }
  } else {
    console.warn('No subject ID found in localStorage') // Debugging
  }
})

const showSingleColumn = computed(() => panel.value.width < 900)

function startPanelDrag(event) {
  event.preventDefault()
  const initialMouseX = event.clientX
  const initialMouseY = event.clientY
  const initialPosX = panel.value.pos.x
  const initialPosY = panel.value.pos.y

  function onDrag(e) {
    const deltaX = e.clientX - initialMouseX
    const deltaY = e.clientY - initialMouseY
    panel.value.pos.x = initialPosX + deltaX
    panel.value.pos.y = initialPosY + deltaY
  }

  function stopDrag() {
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
  }

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

function startResize(event) {
  event.preventDefault()
  const initialWidth = panel.value.width
  const initialHeight = panel.value.height
  const initialMouseX = event.clientX
  const initialMouseY = event.clientY

  function onResize(e) {
    const deltaX = e.clientX - initialMouseX
    const deltaY = e.clientY - initialMouseY
    panel.value.width = Math.max(400, initialWidth + deltaX)
    panel.value.height = Math.max(300, initialHeight + deltaY)
  }

  function stopResize() {
    window.removeEventListener('mousemove', onResize)
    window.removeEventListener('mouseup', stopResize)
  }

  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}

// Fix the watcher to use props.isOpen instead of isOpen
watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal) {
      const subjectId = subjectsStore.selectedSubjectId
      if (subjectId) {
        await videoStore.checkAndShowVideo(subjectId)
      }
    } else {
      videoStore.showVideo = false
    }
  },
  { immediate: true }
)

// Add this watcher to react to video URL changes
watch(
  () => videoStore.videoUrl,
  (newUrl) => {
    if (newUrl && props.isOpen) {
      videoStore.showVideo = true
    }
  }
)

const handleMarkdownLinkClick = (event) => {
  const link = event.target.closest('a')
  if (link && link.href && !link.href.startsWith('#')) {
    event.preventDefault()
    window.electronAPI.openExternal(link.href)
  }
}

// Add new refs
const showSelectionMenu = ref(false)
const selectedText = ref('')

// Add new methods
function handleTextSelection() {
  const selection = window.getSelection()
  const text = selection.toString().trim()
  if (text) {
    selectedText.value = text
    showSelectionMenu.value = true
  } else {
    showSelectionMenu.value = false
  }
}

async function sendToNotes() {
  if (!selectedText.value) return
  try {
    await notesStore.sendMarkdown(selectedText.value)
    showSelectionMenu.value = false
    selectedText.value = ''
  } catch (error) {
    console.error('Failed to send to notes:', error)
  }
}

function copyText() {
  navigator.clipboard
    .writeText(selectedText.value)
    .then(() => {
      console.log('Text copied to clipboard')
    })
    .catch((err) => {
      console.error('Failed to copy text:', err)
    })
  showSelectionMenu.value = false
}

// Add handleClickOutside function before onMounted
const handleClickOutside = (e) => {
  if (
    !e.target.closest('.pointer-events-auto') &&
    !window.getSelection().toString()
  ) {
    showSelectionMenu.value = false
  }
}

// Add handleEscapeKey function
const handleEscapeKey = (e) => {
  if (e.key === 'Escape') {
    showSelectionMenu.value = false
  }
}

// Modify onMounted hook to use the separate handleEscapeKey function
onMounted(() => {
  document.addEventListener('mouseup', handleTextSelection)
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleEscapeKey)
})

// The onUnmounted hook stays the same, but now all functions are defined
onUnmounted(() => {
  document.removeEventListener('mouseup', handleTextSelection)
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
/* Remove cursor styles for dragging */
div[style*='left'] {
  cursor: auto;
}

/* Context menu styles */
.absolute {
  min-width: 140px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Menu item hover effect */
button {
  transition: all 0.2s ease;
}

/* First and last items rounded corners */
button:first-child {
  border-top-left-radius: 0.25rem;
  border-top-right-radius: 0.25rem;
}

button:last-child {
  border-bottom-left-radius: 0.25rem;
  border-bottom-right-radius: 0.25rem;
}

.markdown-content >>> a {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
}

.markdown-content >>> a:hover {
  color: #2563eb;
}

/* Add new styles for pointer events */
.pointer-events-none {
  pointer-events: none;
}

.pointer-events-auto {
  pointer-events: auto;
}

/* Custom Scrollbar Styles */
.markdown-modal {
  scrollbar-width: thin !important;
  scrollbar-color: #4b5563 #1f2937 !important;
}

.markdown-modal::-webkit-scrollbar,
.overflow-y-auto::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

.markdown-modal::-webkit-scrollbar-track,
.overflow-y-auto::-webkit-scrollbar-track {
  background: #1f2937 !important;
  border-radius: 4px !important;
}

.markdown-modal::-webkit-scrollbar-thumb,
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #4b5563 !important;
  border-radius: 4px !important;
  border: 2px solid #1f2937 !important;
}

.markdown-modal::-webkit-scrollbar-thumb:hover,
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: #6b7280 !important;
}

/* For Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937 !important;
}

/* Add styles for floating toolbar */
.shadow-lg {
  box-shadow: 0 0px 30px 5px rgba(0, 0, 0, 0.5),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Add styles for toolbar buttons */
.pointer-events-auto button {
  cursor: pointer;
  outline: none;
}

.pointer-events-auto button:focus {
  outline: none;
  @apply ring-2 ring-blue-500;
}
</style>
