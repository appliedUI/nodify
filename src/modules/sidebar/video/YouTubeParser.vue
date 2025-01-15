<template>
  <div class="form-control w-full max-w-xs px-5 pt-5 h-full pt-4">
    <textarea
      v-model="youtubeUrl"
      @input="handleUrlInput"
      @dragover.prevent
      @drop="handleDrop"
      class="textarea textarea-bordered h-14 bg-base-200 text-xs"
      placeholder="Paste or drop YouTube URL here"
      wrap="soft"
      :disabled="!isSubjectSelected"
    ></textarea>

    <button
      @click="processVideo"
      class="btn btn-secondary btn-sm mt-4"
      :disabled="!youtubeUrl || processing"
    >
      {{ processing ? 'Processing...' : 'Create Graph' }}
    </button>
  </div>
  <DraggableVideoOverlay
    :video-id="videoId"
    :show="showVideo"
    @close="showVideo = false"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useVideoStore } from '@/stores/videoStore'
import { useSubjectsStore } from '@/stores/subjectsStore'
import { toast } from 'vue3-toastify'
import { db } from '@/db/db'
import DraggableVideoOverlay from './DraggableVideoOverlay.vue'

const getYouTubeID = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

const youtubeUrl = ref('')
const processing = ref(false)
const showVideo = ref(false)
const videoId = ref('')
const videoStore = useVideoStore()
const subjectsStore = useSubjectsStore()

const selectedSubjectId = ref(localStorage.getItem('selectedSubjectId') || null)

watch(
  () => subjectsStore.selectedSubjectId,
  (newId) => {
    selectedSubjectId.value = newId
    localStorage.setItem('selectedSubjectId', newId)
  },
  { immediate: true }
)

const isSubjectSelected = computed(() => !!selectedSubjectId.value)

const extractVideoId = () => {
  const url = youtubeUrl.value.trim()
  if (!url) return null

  const id = getYouTubeID(url)
  if (!id) {
    console.error('Invalid YouTube URL')
    return null
  }

  videoId.value = id
  return id
}

const processVideo = async () => {
  try {
    processing.value = true
    const id = extractVideoId()
    if (!id) {
      toast.error('Invalid YouTube URL')
      return
    }

    // Show video overlay immediately after validating URL
    showVideo.value = true

    const currentSubject = subjectsStore.currentSubject
    if (!currentSubject) {
      toast.error('No subject selected')
      return
    }

    // Set video URL and mark as video subject
    await videoStore.setVideoUrl(currentSubject.id, youtubeUrl.value)

    // Fetch transcript
    await videoStore.fetchTranscript(id, currentSubject.id)

    toast.success('Video processed successfully')
  } catch (error) {
    console.error('Error processing video:', error)
    toast.error('Failed to process video')
  } finally {
    processing.value = false
  }
}

const handleUrlInput = () => {
  const id = extractVideoId()
  if (id) {
    videoStore.$patch({ videoId: id })
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  const text = event.dataTransfer.getData('text/plain')
  if ((text && text.includes('youtube.com')) || text.includes('youtu.be')) {
    youtubeUrl.value = text.trim()
    handleUrlInput() // Trigger the input handler to process the URL
  }
}
</script>
