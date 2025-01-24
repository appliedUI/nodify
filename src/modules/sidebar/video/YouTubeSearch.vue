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
      <button @click="searchVideos" class="btn btn-primary">Search</button>
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

    <!-- Pagination -->
    <div v-if="searchResults.length" class="flex justify-center gap-2 mt-4">
      <button @click="prevPage" :disabled="!hasPrevPage" class="btn btn-sm">
        Previous
      </button>
      <button @click="nextPage" :disabled="!hasNextPage" class="btn btn-sm">
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useYoutubeApi } from '@/composables/useYoutubeApi'

const { searchVideos: youtubeSearch, formatDuration } = useYoutubeApi()

const searchQuery = ref('')
const searchResults = ref([])
const isLoading = ref(false)
const currentPage = ref(1)
const totalResults = ref(0)
const resultsPerPage = 9

const hasNextPage = computed(() => {
  return currentPage.value * resultsPerPage < totalResults.value
})

const hasPrevPage = computed(() => {
  return currentPage.value > 1
})

const searchVideos = async () => {
  if (!searchQuery.value.trim()) return

  try {
    isLoading.value = true
    const response = await youtubeSearch(
      searchQuery.value,
      currentPage.value,
      resultsPerPage
    )
    searchResults.value = response.items
    totalResults.value = response.pageInfo.totalResults
  } catch (error) {
    console.error('Error searching videos:', error)
  } finally {
    isLoading.value = false
  }
}

const nextPage = () => {
  currentPage.value++
  searchVideos()
}

const prevPage = () => {
  currentPage.value--
  searchVideos()
}

const selectVideo = (video) => {
  const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`
  emit('select', videoUrl)
}

defineEmits(['select'])
</script>
