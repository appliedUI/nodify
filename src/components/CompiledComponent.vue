<template>
  <div class="compiled-container">
    <h2 class="text-lg font-bold mb-4">Compiled Code</h2>
    <div
      v-if="compiledCode"
      class="compiled-content p-4 bg-gray-800 rounded-lg"
      v-html="compiledCode"
    ></div>
    <p v-else class="text-gray-400 italic">No compiled code available yet.</p>
  </div>
</template>

<script setup>
import { useAIStore } from "../stores/aiChatStore";
import { computed } from "vue";

const store = useAIStore();
const compiledCode = computed(() => store.getLatestCode);

// Add styles for form inputs in compiled code
</script>

<style scoped>
.compiled-container {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}

/* Style form inputs within compiled content */
.compiled-content :deep(input),
.compiled-content :deep(select),
.compiled-content :deep(textarea) {
  background-color: #1f2937;
  color: #e5e7eb;
  border: 1px solid #4b5563;
  border-radius: 0.375rem;
  padding: 0.5rem;
  margin: 0.25rem 0;
  width: 100%;
}

.compiled-content :deep(input:focus),
.compiled-content :deep(select:focus),
.compiled-content :deep(textarea:focus) {
  outline: none;
  border-color: #3b82f6;
  ring: 2px solid #3b82f6;
}

.compiled-content :deep(input::placeholder),
.compiled-content :deep(select::placeholder),
.compiled-content :deep(textarea::placeholder) {
  color: #9ca3af;
}

.compiled-content :deep(option) {
  background-color: #1f2937;
  color: #e5e7eb;
}
</style>
