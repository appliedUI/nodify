<template>
  <div
    v-if="processingProgress"
    class="w-screen absolute bottom-[0px] p-4 text-accent text-sm"
  >
    <div>
      <div class="fixed relative right-0 z-50">
        <transition name="fade">
          <span v-if="displayedText" key="text" class="text-gray-700">{{
            displayedText
          }}</span>
        </transition>
      </div>
      <progress
        class="progress progress-accent h-1 bg-black/20 w-[200px]"
        :value="processingProgress.progress"
        max="1"
      ></progress>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAudioStore } from '@/stores/audioStore'

const audioStore = useAudioStore()
const displayedText = ref('')
const processingProgress = computed(() => audioStore.getProcessingProgress)

// Function to get random text snippet
const getRandomSnippet = (content) => {
  const words = content.split(' ')
  if (words.length <= 3) return content

  const start = Math.floor(Math.random() * (words.length - 3))
  return words.slice(start, start + 3).join(' ')
}

// Watch for progress updates
watch(
  processingProgress,
  (newProgress) => {
    if (newProgress?.content) {
      // Update displayed text every second with random snippet
      const interval = setInterval(() => {
        displayedText.value = getRandomSnippet(newProgress.content)
      }, 1000)

      // Clear interval when progress is complete
      if (newProgress.progress >= 1) {
        clearInterval(interval)
        displayedText.value = newProgress.content
      }
    }
  },
  { immediate: true }
)

// Listen for progress updates from main process
window.electronAPI?.onOpenaiProgress((event, progress) => {
  audioStore.updateProcessingProgress(progress)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
