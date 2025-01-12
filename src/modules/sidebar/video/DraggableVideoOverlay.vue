<template>
  <div
    v-if="show"
    ref="draggableContainer"
    class="fixed z-50"
    :class="{ 'bottom-0': isMinimized }"
    :style="getPositionStyle"
    @mousedown="startDrag"
  >
    <div
      class="bg-base-300 rounded-lg shadow-xl overflow-hidden"
      :class="{ 'w-64': isMinimized }"
    >
      <!-- Header/drag handle -->
      <div
        class="bg-base-200 p-2 cursor-move flex justify-between items-center"
        :class="{ 'cursor-ew-resize': isMinimized }"
      >
        <span class="text-sm font-medium truncate flex-1">
          {{ isMinimized ? 'YouTube Video (Minimized)' : 'YouTube Video' }}
        </span>
        <div class="flex gap-2 flex-shrink-0">
          <button @click="toggleMinimize" class="btn btn-ghost btn-xs">
            <svg
              v-if="!isMinimized"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M4 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1h-2V5H6v10h8v-1h2v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm2 1v10h10V5H5z"
              />
            </svg>
          </button>
          <button @click="$emit('close')" class="btn btn-ghost btn-xs">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Video container - only shown when not minimized -->
      <div v-if="!isMinimized" class="w-[480px] h-[270px] bg-black">
        <iframe
          :src="'https://www.youtube.com/embed/' + videoId"
          class="w-full h-full"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

const props = defineProps({
  videoId: {
    type: String,
    required: true,
  },
  show: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['close'])

const position = ref({ x: 1100, y: 100 })
const minimizedX = ref(window.innerWidth / 2 - 128) // Center initially (256px/2 = 128)
const dragging = ref(false)
const offset = ref({ x: 0, y: 0 })
const draggableContainer = ref(null)
const isMinimized = ref(false)

const getPositionStyle = computed(() => {
  if (isMinimized.value) {
    return {
      left: `${minimizedX.value}px`,
    }
  }
  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
  }
})

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
  if (!isMinimized.value) {
    position.value = lastPosition.value || { x: 100, y: 100 }
  } else {
    // When minimizing, set initial position at center if not already minimized before
    if (minimizedX.value === null) {
      minimizedX.value = window.innerWidth / 2 - 128
    }
  }
}

const lastPosition = ref(null)

const startDrag = (e) => {
  if (e.target.closest('button')) return

  dragging.value = true
  if (isMinimized.value) {
    offset.value = {
      x: e.clientX - minimizedX.value,
    }
  } else {
    offset.value = {
      x: e.clientX - position.value.x,
      y: e.clientY - position.value.y,
    }
  }
}

const onDrag = (e) => {
  if (!dragging.value) return

  if (isMinimized.value) {
    // When minimized, only allow horizontal movement within window bounds
    const newX = e.clientX - offset.value.x
    const maxX = window.innerWidth - 256 // 256px is the width of minimized header
    minimizedX.value = Math.max(0, Math.min(newX, maxX))
  } else {
    position.value = {
      x: e.clientX - offset.value.x,
      y: e.clientY - offset.value.y,
    }
    lastPosition.value = { ...position.value }
  }
}

const stopDrag = () => {
  dragging.value = false
}

// Handle window resize
const onResize = () => {
  if (isMinimized.value) {
    // Ensure the minimized header stays within bounds when window is resized
    const maxX = window.innerWidth - 256
    minimizedX.value = Math.min(minimizedX.value, maxX)
  }
}

watch(
  () => props.show,
  (newValue) => {
    if (!newValue) {
      isMinimized.value = false
    }
  }
)

onMounted(() => {
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('resize', onResize)
})
</script>
