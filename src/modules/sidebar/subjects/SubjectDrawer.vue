<template>
  <div class="drawer-container" :class="{ 'drawer-open': isOpen }">
    <div class="drawer-content bg-base-100">
      <!-- Close button -->
      <button
        class="absolute top-4 right-6 p-2 hover:bg-base-200 rounded-full transition-colors"
        @click="close"
      >
        <ArrowRightCircleIcon class="h-6 w-6" />
      </button>

      <!-- Notes Editor -->
      <NotesEditor />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NotesEditor from './NotesEditor.vue'
import { ArrowRightCircleIcon } from '@heroicons/vue/24/outline'

const isOpen = ref(false)
const activeTab = ref('notes') // Default to notes tab

const open = () => {
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

defineExpose({
  open,
  close,
})
</script>

<style scoped>
.drawer-container {
  position: fixed;
  top: 0;
  right: -600px;
  width: 600px;
  height: 100vh;
  z-index: 1000;
  transition: right 0.3s ease-in-out;
  background-color: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.drawer-open {
  right: 0;
}

.drawer-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
  position: relative;
}

/* Add the same tab styling from Sidebar.vue */
.tab {
  border-color: rgba(244, 222, 53, 0.1) !important;
  color: rgb(148, 148, 148);
}

.tab-active {
  border-bottom: 1px solid #f48c06 !important;
  color: white;
}

.tab:hover {
  color: White;
}
</style>
