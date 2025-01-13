<template>
  <div
    v-if="show"
    class="w-screen absolute bottom-[0px] p-4 text-accent text-sm"
  >
    <transition name="fade-out">
      <div
        class="fixed transform flex flex-col items-start z-50"
        :class="{
          'bottom-[30px] left-[260px]': !savingIndicator,
          'top-[110px] right-[20px]': savingIndicator,
        }"
      >
        <div class="bg-base-300/70 backdrop-blur rounded-lg p-3 shadow-lg">
          <div class="flex items-center gap-2 h-5">
            <transition name="fade">
              <span v-if="displayedText" key="text" class="text-gray-700">{{
                displayedText
              }}</span>
            </transition>
          </div>
          <div
            v-if="!savingIndicator"
            class="w-48 h-2 bg-base-200 rounded-full mt-2 overflow-hidden"
          >
            <progress class="progress w-56"></progress>
          </div>
        </div>
      </div>
    </transition>
    <!-- ...existing code... -->
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAudioStore } from '@/stores/audioStore'

const audioStore = useAudioStore()
const displayedText = ref('')
const processingProgress = computed(() => audioStore.getProcessingProgress)

const show = ref(false)
const savingIndicator = ref(false)
const progressText = ref('')
const progress = ref(0)

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
      show.value = true
      savingIndicator.value = newProgress.savingIndicator || false
      progressText.value = newProgress.progressText || 'Processing...'
      progress.value = newProgress.progress * 100

      // Update displayed text every second with random snippet
      const interval = setInterval(() => {
        displayedText.value = getRandomSnippet(newProgress.content)
      }, 1000)

      // Clear interval when progress is complete
      if (newProgress.progress >= 1) {
        clearInterval(interval)
        displayedText.value = newProgress.content
        show.value = false
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
.fade-out-enter-active,
.fade-out-leave-active {
  transition: opacity 0.5s;
}
.fade-out-enter-from,
.fade-out-leave-to {
  opacity: 0;
}

.loading-circle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: gray;
}
.bg-success {
  background-color: green;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
