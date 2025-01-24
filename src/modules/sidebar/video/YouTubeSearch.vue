<template>
  <div class="flex flex-col h-full">
    <!-- Search Input -->
    <div class="flex gap-2 my-2">
      <input
        v-model="searchQuery"
        @keyup.enter="searchVideos"
        type="text"
        placeholder="Search YouTube..."
        class="input input-bordered w-full"
      />
      <!-- Region Selector -->
      <select
        v-model="regionCode"
        class="select select-bordered w-32"
        @change="searchVideos"
      >
        <option value="US">🇺🇸 United States</option>
        <option value="GB">🇬🇧 United Kingdom</option>
        <option value="CA">🇨🇦 Canada</option>
        <option value="AU">🇦🇺 Australia</option>
        <option value="IN">🇮🇳 India</option>
        <option value="JP">🇯🇵 Japan</option>
        <option value="DE">🇩🇪 Germany</option>
        <option value="FR">🇫🇷 France</option>
        <option value="BR">🇧🇷 Brazil</option>
        <option value="MX">🇲🇽 Mexico</option>
      </select>
      <button @click="searchVideos" class="btn btn-primary">Search</button>
      <!-- Pagination Controls -->
      <div class="flex gap-1">
        <button
          @click="prevPage"
          :disabled="!hasPrevPage"
          class="btn btn-square btn-ghost p-2"
          title="Previous"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          @click="nextPage"
          :disabled="!hasNextPage"
          class="btn btn-square btn-ghost p-2"
          title="Next"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Results Grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1"
    >
      <div
        v-for="video in searchResults"
        :key="video.id.videoId"
        class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
        @click="selectVideo(video)"
      >
        <figure class="relative aspect-video">
          <img
            :src="video.snippet.thumbnails.medium.url"
            :alt="video.snippet.title"
            class="w-full h-full object-cover"
          />
          <div
            v-if="!showHistory"
            class="absolute bottom-0 right-0 bg-black bg-opacity-75 px-2 py-1 text-xs text-white"
          >
            {{ formatDuration(video.contentDetails?.duration) }}
          </div>
        </figure>
        <div class="card-body p-4">
          <h2 class="card-title text-sm">{{ video.snippet.title }}</h2>
          <p class="text-xs text-gray-500">{{ video.snippet.channelTitle }}</p>
        </div>
      </div>
    </div>

    <!-- History Controls -->
    <div
      v-if="showHistory && searchResults.length"
      class="flex justify-end mt-2"
    >
      <button @click="clearHistory" class="btn btn-sm btn-error">
        Clear History
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useYoutubeApi } from '@/composables/useYoutubeApi'

// Define emits at the top of the script
const emit = defineEmits(['select'])

const { searchVideos: youtubeSearch, formatDuration } = useYoutubeApi()

const searchQuery = ref('')
const searchResults = ref([])
const isLoading = ref(false)
const currentPage = ref(1)
const totalResults = ref(0)
const resultsPerPage = 9
const showHistory = ref(true)
const nextPageToken = ref('')
const prevPageToken = ref('')
const regionCode = ref('US') // Set your region code here

// Get watched videos from localStorage
const watchedVideos = ref(
  JSON.parse(localStorage.getItem('watchedVideos') || '[]')
)

const hasNextPage = computed(() => {
  return currentPage.value * resultsPerPage < totalResults.value
})

const hasPrevPage = computed(() => {
  return currentPage.value > 1
})

// Add video to history
const addToHistory = (video) => {
  const existingIndex = watchedVideos.value.findIndex(
    (v) => v.id.videoId === video.id.videoId
  )
  if (existingIndex !== -1) {
    watchedVideos.value.splice(existingIndex, 1)
  }
  watchedVideos.value.unshift(video)
  if (watchedVideos.value.length > 50) {
    watchedVideos.value.pop()
  }
  localStorage.setItem('watchedVideos', JSON.stringify(watchedVideos.value))
}

// Clear history
const clearHistory = () => {
  watchedVideos.value = []
  localStorage.removeItem('watchedVideos')
}

const searchVideos = async () => {
  if (!searchQuery.value.trim()) return
  showHistory.value = false

  try {
    isLoading.value = true
    const response = await youtubeSearch(
      searchQuery.value,
      currentPage.value,
      resultsPerPage,
      30, // days back
      regionCode.value,
      currentPage.value > 1 ? nextPageToken.value : ''
    )

    searchResults.value = response.items
    totalResults.value = response.pageInfo.totalResults
    nextPageToken.value = response.nextPageToken || ''
    prevPageToken.value = response.prevPageToken || ''
  } catch (error) {
    console.error('Error searching videos:', error)
  } finally {
    isLoading.value = false
  }
}

const nextPage = () => {
  if (nextPageToken.value) {
    currentPage.value++
    searchVideos()
  }
}

const prevPage = () => {
  if (prevPageToken.value) {
    currentPage.value--
    searchVideos()
  }
}

const selectVideo = (video) => {
  addToHistory(video)
  const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`
  emit('select', videoUrl)
  console.log('Video selected:', videoUrl)
}

// Show history on mount
onMounted(() => {
  if (watchedVideos.value.length > 0) {
    searchResults.value = watchedVideos.value
  }
})
</script>
