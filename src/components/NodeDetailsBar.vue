<template>
  <div
    v-if="node"
    class="fixed bottom-0 left-0 right-0 bg-gray-900 p-2 border-t border-gray-700"
  >
    <div class="flex space-x-4 max-w-screen-sm">
      <!-- Label -->
      <div class="flex items-center space-x-2">
        <input
          type="text"
          v-model="node.label"
          @keydown.delete.stop
          @keydown.backspace.stop
          class="w-32 h-6 px-2 text-xs text-white bg-gray-700 border border-gray-600 rounded focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-2">
        <button
          @click="saveNode"
          class="h-6 px-3 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          Save
        </button>
        <button
          @click="closePanel"
          class="h-6 px-3 text-xs font-medium text-gray-300 bg-gray-700 rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  node: {
    type: Object,
    required: false,
    default: null,
  },
});
</script>
