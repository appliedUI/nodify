<template>
  <div class="w-full max-w-4xl mx-auto p-8 bg-base-100 rounded-3xl">
    <div class="relative" style="height: 400px; overflow-y: auto">
      <!-- Vertical line -->
      <div class="absolute left-6 top-0 bottom-0 w-px bg-gray-700"></div>

      <!-- Timeline items -->
      <div class="space-y-12">
        <div
          v-for="(item, index) in userHistory"
          :key="index"
          class="relative flex items-start"
        >
          <!-- Circle on the line -->
          <div class="absolute left-6 -translate-x-1/2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-3 h-3 text-blue-500 fill-current"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="12" />
            </svg>
          </div>

          <!-- Content -->
          <div class="ml-16 relative w-full">
            <!-- Date -->
            <span class="text-sm text-gray-500 mb-2 block -mt-1">
              {{ formatDate(item.timestamp) }}
            </span>

            <!-- Content box -->
            <div
              class="bg-base-100 rounded-2xl p-6 shadow-lg border border-gray-700"
            >
              <h3 class="text-sm font-semibold text-accent mb-2">
                {{ formatTitle(item.action) }}
              </h3>
              <p class="text-white/70 text-sm">
                {{ item.details }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()

// Get user history from store, sorted by timestamp in descending order
const userHistory = computed(() => {
  const history = userStore.user?.history || []
  return [...history].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )
})

// Function to format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Function to format action title
const formatTitle = (action) => {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Fetch user data on mount
onMounted(async () => {
  await userStore.fetchUser()
})
</script>

<style scoped>
/* Add any additional custom styles here if needed */
</style>
