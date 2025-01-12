<template>
  <transition name="fade-out">
    <div
      v-if="show"
      class="fixed transform flex flex-col items-start z-50"
      :class="{
        'bottom-[30px] left-[260px]': !savingIndicator,
        'top-[110px] right-[20px]': savingIndicator,
      }"
    >
      <div class="bg-base-300/70 backdrop-blur rounded-lg p-3 shadow-lg">
        <div class="flex items-center gap-2">
          <div
            class="loading-circle"
            :class="{ 'bg-success': savingIndicator || progress === 100 }"
          ></div>
          <div class="text-sm text-base-content">{{ progressText }}</div>
        </div>
        <div
          v-if="!savingIndicator"
          class="w-48 h-2 bg-base-200 rounded-full mt-2 overflow-hidden"
        >
          <div
            class="h-full bg-success transition-all duration-300 ease-out rounded-full"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: 0,
  },
  savingIndicator: {
    type: Boolean,
    default: false,
  },
})

const progressText = computed(() => {
  if (props.savingIndicator) return 'Saving...'
  if (props.progress === 100) return 'Complete'
  return `Generating graph... ${Math.round(props.progress)}%`
})
</script>

<style scoped>
.loading-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #4ade80;
  z-index: 9999;
}

.fade-out-enter-active,
.fade-out-leave-active {
  transition: opacity 0.5s ease-in-out;
}

.fade-out-enter-from,
.fade-out-leave-to {
  opacity: 0;
}

.fade-out-enter-to,
.fade-out-leave-from {
  opacity: 1;
}
</style>
