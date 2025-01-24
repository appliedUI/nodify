<template>
  <div class="flex flex-col h-full items-center justify-center mx-[100px]">
    <div class="card bg-base-100 shadow-xl w-full">
      <div class="card-body">
        <form @submit.prevent="saveKey" class="flex flex-col gap-4">
          <div class="flex items-center gap-4">
            <div class="flex-none w-[25%]">
              <h2 class="text-xl font-semibold">Add YouTube API Key</h2>
            </div>
            <div class="flex-1">
              <input
                v-model="apiKey"
                type="password"
                placeholder="Enter your YouTube API key"
                class="input input-bordered w-full bg-base-200"
                required
              />
            </div>
            <div class="flex-none">
              <button type="submit" class="btn btn-primary">Save Key</button>
            </div>
          </div>
        </form>
        <div class="text-xs text-base-content/70 mt-2">
          <p>
            You can get a YouTube API key from the
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              class="link link-primary"
            >
              Google Cloud Console
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { toast } from 'vue3-toastify'

const YOUTUBE_KEY = 'youtube_api_key'
const apiKey = ref('')

const saveKey = () => {
  try {
    localStorage.setItem(YOUTUBE_KEY, apiKey.value)
    toast('YouTube API key saved successfully', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      autoClose: 2000,
      transition: 'slide',
    })
  } catch (error) {
    console.error('Error saving YouTube API key:', error)
    toast('Failed to save YouTube API key', {
      theme: 'auto',
      type: 'error',
      position: 'bottom-center',
      autoClose: 2000,
      transition: 'slide',
    })
  }
}

onMounted(() => {
  const storedKey = localStorage.getItem(YOUTUBE_KEY)
  if (storedKey) {
    apiKey.value = storedKey
  }
})
</script>

<style scoped>
/* Add any custom styles here */
</style>
