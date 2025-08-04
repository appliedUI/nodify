<template>
  <transition
    enter-active-class="transition-all duration-500 ease-in-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-500 ease-in-out"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showPanel"
      class="bg-primary text-white fixed bottom-0 w-[230px] z-50 left-0 tranPanel"
    >
      <div class="max-w-4xl mx-auto">
        <div class="bg-primary p-2 rounded-lg shadow-lg mb-2">
          <div class="flex justify-between items-center mt-3 mb-4">
            <span class="text-xs text-gray-400">
              <span v-if="videoStore.transcriptLoading">
                Fetching YouTube transcript...
              </span>
              <span v-else-if="videoStore.transcriptError">
                Transcript Error
              </span>
              <span
                v-else-if="!displayedTranscript || !displayedTranscript.trim()"
              >
                Processing...
              </span>
            </span>

            <div class="flex space-x-3">
              <span
                class="text-xs text-orange-400"
                v-if="
                  isRegenerating ||
                  isGenerating ||
                  audioStore.isMarkdownProcessing ||
                  videoStore.transcriptLoading
                "
              >
                <span v-if="videoStore.transcriptLoading">
                  Fetching transcript...
                </span>
                <span v-else> Generating... </span>
              </span>
              <!-- Retry button for transcript errors -->
              <div
                v-if="videoStore.transcriptError"
                class="tooltip"
                data-tip="Retry fetching transcript"
              >
                <ArrowPathIcon
                  class="w-5 h-5 cursor-pointer text-red-400 hover:text-red-300"
                  @click="retryTranscriptFetch"
                />
              </div>
              <div
                v-if="hasVideo"
                class="tooltip"
                data-tip="Show YouTube Video"
              >
                <VideoCameraIcon
                  class="w-5 h-5 cursor-pointer hover:text-blue-400 text-"
                  @click="showVideo = true"
                />
              </div>
              <div
                v-if="hasGeneratedMarkdown"
                class="tooltip"
                data-tip="Regenerate markdown transcript"
              >
                <ArrowPathIcon
                  class="w-5 h-5 cursor-pointer"
                  :class="isRegenerating ? 'animate-spin' : ''"
                  @click="handleRegenerate"
                />
              </div>
              <div
                class="tooltip"
                data-tip="Go Deeper. Generates a markdown transcript"
              >
                <SparklesIcon
                  class="w-5 h-5 cursor-pointer"
                  @click="generateMarkdown"
                  :class="isGenerating ? 'animate-pulse' : ''"
                />
              </div>
              <div class="tooltip" data-tip="Copy to clipboard">
                <component
                  :is="showCheckMark ? CheckCircleIcon : DocumentDuplicateIcon"
                  class="cursor-pointer"
                  :class="
                    showCheckMark
                      ? 'w-5 h-5 text-green-500'
                      : 'w-5 h-5 text-white'
                  "
                  @click="copyToClipboard(displayedTranscript)"
                />
              </div>
            </div>
          </div>
          <div
            class="bg-base-100 p-3 rounded-lg h-[130px] overflow-y-scroll scrollbar-hide"
          >
            <!-- Error state -->
            <div
              v-if="videoStore.transcriptError"
              class="text-sm text-red-400 space-y-2"
            >
              <div>{{ videoStore.transcriptError }}</div>
              <button
                @click="retryTranscriptFetch"
                class="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
              >
                Retry
              </button>
            </div>
            <!-- Loading state -->
            <div
              v-else-if="videoStore.transcriptLoading"
              class="text-sm text-blue-400"
            >
              <div class="animate-pulse">Fetching YouTube transcript...</div>
            </div>
            <!-- Success state -->
            <div
              v-else-if="displayedTranscript && displayedTranscript.trim()"
              class="markdown-body dark-theme text-sm"
              v-html="md.render(displayedTranscript)"
            ></div>
            <!-- Default processing state -->
            <div v-else class="text-sm text-gray-400">
              Recording completed. Processing transcript...
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
  <DraggableVideoOverlay
    v-if="subjectsStore.currentSubject?.youtubeUrl"
    :video-id="youtubeVideoId"
    :show="showVideo"
    :transcript="videoStore.youtubeTranscript"
    @close="showVideo = false"
  />
  <!-- Markdown Modal -->
  <TranscriptModal
    :isOpen="isMarkdownModalOpen"
    :transcript="transcript"
    @close="isMarkdownModalOpen = false"
  >
    <div class="markdown-modal">
      <div
        class="markdown-body"
        :transcript="transcript"
        v-html="compiledMarkdown(generatedMarkdown)"
      ></div>
    </div>
  </TranscriptModal>
</template>

<script setup>
import { onMounted, watch, ref, watchEffect, computed, onUnmounted } from 'vue'
import { useAudioStore } from '@/stores/audioStore'
import { useSubjectsStore } from '@/stores/subjectsStore'
import { useVideoStore } from '@/stores/videoStore'
import { toast } from 'vue3-toastify'
import {
  DocumentDuplicateIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
  VideoCameraIcon,
} from '@heroicons/vue/24/outline'
import { db } from '@/db/db'
import TranscriptModal from './TranscriptModal.vue'
import MarkdownIt from 'markdown-it'
import '@/assets/css/markdown-modal.css'
import DraggableVideoOverlay from '../video/DraggableVideoOverlay.vue'
import { usePDFStore } from '@/stores/pdfStore'

const audioStore = useAudioStore()
const subjectsStore = useSubjectsStore()
const videoStore = useVideoStore()
const pdfStore = usePDFStore()
const transcript = ref('')
const lastLoadedSubjectId = ref(null)
const showCheckMark = ref(false)
const isProcessing = ref(false)
const hasTranscript = ref(false)
const isMarkdownModalOpen = ref(false)
// const compiledMarkdown = computed(() => md.render(transcript.value))
const generatedMarkdown = ref('')
const isGenerating = ref(false)
const showPanel = ref(false)
const isRegenerating = ref(false)

const showVideo = ref(false)
const youtubeVideoId = computed(() => {
  const url = subjectsStore.currentSubject?.youtubeUrl
  if (!url) return null

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
})

// Computed property to determine which transcript to display
const displayedTranscript = computed(() => {
  // If there's a YouTube transcript, use it (replaces whisper transcript)
  if (videoStore.youtubeTranscript) {
    return videoStore.youtubeTranscript
  }
  // Otherwise, fall back to the whisper transcript
  return transcript.value
})

const md = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: true,
  linkify: true,
  typographer: true,
})

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    toast('Copied to clipboard', {
      theme: 'auto',
      type: 'info',
      position: 'top-center',
      autoClose: 500,
      transition: 'slide',
    })
    showCheckMark.value = true
    setTimeout(() => {
      showCheckMark.value = false
    }, 2000)
  } catch (err) {
    toast.error('Failed to copy text')
  }
}

const LOCAL_STORAGE_KEY = 'markdownTranscripts'

// Add this function to get/set markdown transcripts
const getMarkdownFromStorage = (subjectId) => {
  const transcripts = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'
  )
  return transcripts[subjectId] || null
}

const saveMarkdownToStorage = (subjectId, markdown) => {
  const transcripts = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'
  )
  transcripts[subjectId] = markdown
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transcripts))
}

const MARKDOWN_GENERATED_KEY = 'markdownGeneratedSubjects'

// Add new functions to manage markdown generation state
const setMarkdownGeneratedForSubject = (subjectId) => {
  const generated = JSON.parse(
    localStorage.getItem(MARKDOWN_GENERATED_KEY) || '{}'
  )
  generated[subjectId] = true
  localStorage.setItem(MARKDOWN_GENERATED_KEY, JSON.stringify(generated))
}

const hasGeneratedMarkdown = computed(() => {
  const subjectId = subjectsStore.selectedSubjectId
  if (!subjectId) return false
  const generated = JSON.parse(
    localStorage.getItem(MARKDOWN_GENERATED_KEY) || '{}'
  )
  return !!generated[subjectId]
})

// Add this computed property
const hasVideo = computed(() => {
  return !!subjectsStore.currentSubject?.youtubeUrl || !!videoStore.videoUrl
})

// Add this watcher
// Fix: Use a store mutation/action to update youtubeUrl
watch(
  () => videoStore.videoUrl,
  (newUrl) => {
    if (newUrl && subjectsStore.currentSubject) {
      // Replace with a proper store mutation/action
      if (typeof subjectsStore.setYoutubeUrl === 'function') {
        subjectsStore.setYoutubeUrl(subjectsStore.currentSubject.id, newUrl)
      } else {
        // fallback: update via subjectsStore.updateSubject if available
        if (typeof subjectsStore.updateSubject === 'function') {
          subjectsStore.updateSubject(subjectsStore.currentSubject.id, {
            youtubeUrl: newUrl,
          })
        }
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  showPanel.value = false
  // Only load transcript if subject is selected
  const subjectId = subjectsStore.selectedSubjectId
  if (!subjectId) return
  await loadTranscriptForSubject(subjectId)
  await testVideoUrl()
})

async function loadTranscriptForSubject(subjectId, force = false) {
  if (!subjectId) return
  if (lastLoadedSubjectId.value === subjectId && !force) return
  lastLoadedSubjectId.value = subjectId
  try {
    // Try localStorage first
    const storedMarkdown = getMarkdownFromStorage(subjectId)
    if (storedMarkdown) {
      generatedMarkdown.value = storedMarkdown
    } else {
      const markdown = await subjectsStore.fetchMarkdownTranscript(subjectId)
      if (markdown) {
        generatedMarkdown.value = markdown
        saveMarkdownToStorage(subjectId, markdown)
      }
    }
  } catch (error) {
    console.error('Error fetching markdown transcript:', error)
  }
  // Try PDF transcript
  try {
    const pdfs = await db.getPDFsBySubject(subjectId)
    if (pdfs.length > 0) {
      const latestPDF = pdfs[pdfs.length - 1]
      if (latestPDF.markdownContent) {
        transcript.value = cleanTranscript(latestPDF.markdownContent)
        hasTranscript.value = true
        return
      }
    }
  } catch (error) {
    console.error('Error loading PDF transcript:', error)
  }
  // Try audio transcript
  try {
    const audioTranscript = await audioStore.getTranscriptsBySubjectId(
      subjectId
    )
    if (audioTranscript) {
      transcript.value = cleanTranscript(audioTranscript)
      hasTranscript.value = true
      return
    }
  } catch (error) {
    console.error('Error loading audio transcript:', error)
  }
  // Try DB subject transcript
  try {
    const subject = await db.subjects.get(subjectId)
    if (subject?.graph?.transcript?.source) {
      transcript.value = cleanTranscript(subject.graph.transcript.text)
      hasTranscript.value = true
    } else {
      transcript.value = ''
      hasTranscript.value = false
    }
  } catch (error) {
    console.error('Error fetching subject from db:', error)
    transcript.value = ''
    hasTranscript.value = false
  }
}

// Watch for changes in videoStore.youtubeTranscript and update transcript accordingly
watch(
  () => videoStore.youtubeTranscript,
  (newTranscript) => {
    if (newTranscript && newTranscript !== transcript.value) {
      transcript.value = cleanTranscript(newTranscript)
      hasTranscript.value = true
    }
  }
)

// Add this helper function to clean up the transcript
const cleanTranscript = (text) => {
  return text.replace(/&amp;#39;/g, "'")
}

// Update watchEffect to control panel visibility
watchEffect(async () => {
  const subjectId = subjectsStore.selectedSubjectId
  if (subjectId) {
    showPanel.value = true
    if (lastLoadedSubjectId.value !== subjectId) {
      await loadTranscriptForSubject(subjectId)
    }
  } else {
    showPanel.value = false
    transcript.value = ''
    hasTranscript.value = false
    lastLoadedSubjectId.value = null
  }
})

// Modify the transcript watch to use the cleaner
watch(
  () => subjectsStore.currentSubject?.transcript,
  async (newTranscript) => {
    if (!newTranscript || newTranscript === transcript.value) return

    const cleanedTranscript = cleanTranscript(newTranscript)

    if (!audioStore.isProcessing && !videoStore.isVideoProcessing) {
      transcript.value = cleanedTranscript
      hasTranscript.value = true
      return
    }

    transcript.value = cleanedTranscript
    hasTranscript.value = true

    try {
      isProcessing.value = true
      const graphData = await window.electronAPI.generateGraphWithOpenAI({
        apiKey: localStorage.getItem('openai_key'),
        transcript: cleanedTranscript,
        subjectId: subjectsStore.selectedSubjectId,
      })
      await db.subjects.update(subjectsStore.selectedSubjectId, {
        graph: graphData,
      })
    } catch (error) {
      console.error('Error generating graph:', error)
    } finally {
      isProcessing.value = false
    }
  }
)

// Watch for changes in videoStore.youtubeTranscript and update the displayed transcript
watch(
  () => videoStore.youtubeTranscript,
  (newTranscript) => {
    if (newTranscript) {
      transcript.value = cleanTranscript(newTranscript)
      hasTranscript.value = true
    }
  }
)

// Watch processing progress
watchEffect(() => {
  isProcessing.value = audioStore.processingProgress !== null
})

// Close modal when transcript changes
watch(
  () => transcript.value,
  () => {
    if (isMarkdownModalOpen.value) {
      isMarkdownModalOpen.value = false
    }
  }
)

// Markdown rendering

function compiledMarkdown(markdown) {
  return md.render(markdown || '')
}

async function generateMarkdown() {
  const subjectId = subjectsStore.selectedSubjectId
  if (!subjectId) return

  try {
    audioStore.setMarkdownProcessing(true)

    // Get video URL and show video if available
    const hasVideo = await videoStore.checkAndShowVideo(subjectId)

    // Check localStorage first
    const storedMarkdown = getMarkdownFromStorage(subjectId)
    console.log('Found stored markdown:', !!storedMarkdown)

    // Always get the video URL first, regardless of stored markdown
    const videoUrl = await videoStore.getVideoUrl(subjectId)
    console.log('Retrieved video URL:', videoUrl)

    if (videoUrl) {
      let videoId = null

      // Handle youtu.be format
      if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]
      }
      // Handle youtube.com format
      else if (videoUrl.includes('youtube.com/watch')) {
        videoId = videoUrl.split('v=')[1]?.split('&')[0]
      }

      console.log('Extracted videoId:', videoId)
      if (videoId) {
        videoStore.videoId = videoId
        console.log('Set videoStore.videoId to:', videoId)
      }
    }

    if (storedMarkdown) {
      generatedMarkdown.value = storedMarkdown
      isMarkdownModalOpen.value = true
      console.log(
        'About to call toggleVideo(true) with videoId:',
        videoStore.videoId
      )
      videoStore.toggleVideo(true)
      return
    }

    isGenerating.value = true
    // Use displayedTranscript instead of transcript for markdown generation
    const markdown = await subjectsStore.processTranscript(
      displayedTranscript.value
    )

    // Save to localStorage
    saveMarkdownToStorage(subjectId, markdown)

    // After successful generation, mark as completed
    setMarkdownGeneratedForSubject(subjectId)

    generatedMarkdown.value = markdown
    isMarkdownModalOpen.value = true
    console.log('About to call toggleVideo(true) after generating markdown')
    videoStore.toggleVideo(true)

    if (hasVideo) {
      // Force update video visibility
      videoStore.showVideo = true
    }
  } catch (error) {
    console.error('Error generating markdown:', error)
    toast.error('Failed to generate markdown')
  } finally {
    audioStore.setMarkdownProcessing(false)
    isGenerating.value = false
  }
}

watch(
  () => isMarkdownModalOpen.value,
  (newVal) => {
    console.log('Modal state changed:', newVal)
    if (!newVal) {
      console.log('Closing modal, calling toggleVideo(false)')
      videoStore.toggleVideo(false)
    }
  }
)

// Add this function to test video URL
async function testVideoUrl() {
  const subjectId = subjectsStore.selectedSubjectId
  if (!subjectId) {
    console.log('No subject selected')
    return
  }

  try {
    const videoUrl = await videoStore.getVideoUrl(subjectId)
    console.log('Current video URL for subject:', { subjectId, videoUrl })

    if (!videoUrl) {
      // For testing, use a video known to have transcripts (TED Talk)
      const testUrl = 'https://www.youtube.com/watch?v=ZMrv68qsDxo'
      await videoStore.setVideoUrl(subjectId, testUrl)
      console.log('Set test video URL:', testUrl)
    }
  } catch (error) {
    console.error('Error in testVideoUrl:', error)
  }
}

async function handleRegenerate() {
  const subjectId = subjectsStore.selectedSubjectId
  if (!subjectId) return

  try {
    isRegenerating.value = true
    // Use displayedTranscript instead of transcript for regeneration
    const newMarkdown = await subjectsStore.processTranscript(
      displayedTranscript.value
    )

    // Update local state
    generatedMarkdown.value = newMarkdown
    saveMarkdownToStorage(subjectId, newMarkdown)

    // Update database
    await db.updateMarkdownTranscript(subjectId, newMarkdown)

    toast.success('Markdown regenerated successfully')
  } catch (error) {
    console.error('Error regenerating markdown:', error)
    toast.error('Failed to regenerate markdown')
  } finally {
    isRegenerating.value = false
  }
}

// Add retry function for transcript fetching
async function retryTranscriptFetch() {
  const subjectId = subjectsStore.selectedSubjectId
  if (!subjectId) return

  try {
    const videoUrl = await videoStore.getVideoUrl(subjectId)
    if (!videoUrl) {
      toast.error('No video URL found for this subject')
      return
    }

    let videoId = null
    if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]
    } else if (videoUrl.includes('youtube.com/watch')) {
      videoId = videoUrl.split('v=')[1]?.split('&')[0]
    }

    if (!videoId) {
      toast.error('Invalid video URL format')
      return
    }

    toast('Retrying transcript fetch...', {
      theme: 'auto',
      type: 'info',
      position: 'top-center',
      autoClose: 2000,
    })

    await videoStore.retryTranscriptFetch(videoId, subjectId)
    toast.success('Transcript fetched successfully!')
  } catch (error) {
    console.error('Error retrying transcript fetch:', error)
    toast.error(`Failed to fetch transcript: ${error.message}`)
  }
}

const startRecording = () => {
  audioStore.setAudioRecording(true)
  // Additional recording logic...
}

const stopRecording = () => {
  audioStore.setAudioRecording(false)
  // Additional stop recording logic...
}

// Clean up when component is unmounted
onUnmounted(() => {
  audioStore.setAudioRecording(false)
})

// Modify the watch effect for pdfStore.isProcessing
watch(
  () => pdfStore.isProcessing,
  async (isProcessing, wasProcessing) => {
    if (isProcessing) {
      showPanel.value = true
      return
    }

    if (wasProcessing && !isProcessing) {
      const subjectId = subjectsStore.selectedSubjectId
      if (!subjectId) return

      try {
        const pdfs = await pdfStore.getPDFsForSubject(subjectId)
        if (pdfs.length > 0) {
          const latestPDF = pdfs[pdfs.length - 1]
          if (latestPDF.markdownContent) {
            transcript.value = cleanTranscript(latestPDF.markdownContent)
            hasTranscript.value = true
            showPanel.value = true
          }
        }
      } catch (error) {
        console.error('Error handling PDF processing:', error)
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.btn-xs svg {
  @apply transition-colors duration-200;
}

.btn-xs:hover svg {
  @apply text-blue-400;
}

.tranPanel {
  box-shadow: 0 -22px 20px rgba(0, 0, 0, 0.2);
}

.markdown-body.dark-theme {
  @apply text-gray-100;
}

.markdown-body.dark-theme h1,
.markdown-body.dark-theme h2,
.markdown-body.dark-theme h3 {
  @apply text-white border-b border-gray-700;
}

.markdown-body.dark-theme code {
  @apply bg-gray-800 text-gray-100;
}

.markdown-body.dark-theme pre {
  @apply bg-gray-800 text-gray-100 p-3 rounded;
}

.markdown-body.dark-theme a {
  @apply text-blue-400 hover:text-blue-300;
}
</style>
