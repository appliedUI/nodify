<template>
  <div class="params-container text-xs" v-if="block">
    <!-- Eye Icon Button -->
    <button
      @click="togglePreview"
      class="fixed right-4 top-4 z-50 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
    >
      <EyeIcon class="w-6 h-6 text-gray-300" />
    </button>

    <!-- Preview Side Panel -->
    <div class="fixed inset-0 z-40" v-if="showPreview" @click="togglePreview">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/30"></div>

      <!-- Panel Content -->
      <div
        class="absolute right-0 top-0 h-full w-96 bg-gray-800 shadow-lg transform transition-transform duration-300"
        :class="{
          'translate-x-0': showPreview,
          'translate-x-full': !showPreview,
        }"
        @click.stop
      >
        <div class="p-6">
          <h2 class="text-lg font-bold mb-4 text-gray-100">Preview</h2>
          <div v-if="block.agentPrompt" class="mb-6">
            <h3 class="font-bold text-gray-300 mb-2">Agent Prompt:</h3>
            <p class="text-gray-400">{{ block.agentPrompt }}</p>
          </div>
          <div v-if="block.code" class="mb-6">
            <h3 class="font-bold text-gray-300 mb-2">Code:</h3>
            <pre class="text-gray-400">{{ block.code }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Existing Content -->
    <div v-if="block.agentPrompt">
      <h3 class="font-bold">Agent Prompt:</h3>
      <p>{{ block.agentPrompt }}</p>
    </div>
    <div v-if="block.code">
      <h3 class="font-bold">Code:</h3>
      <pre>{{ block.code }}</pre>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useCodeStore } from "@/stores/codeStore";
import { EyeIcon } from "@heroicons/vue/24/outline";

const codeStore = useCodeStore();
const showPreview = ref(false);

const nodeCode = computed(() => codeStore.nodeCode);
const nodeBlocks = computed(() => codeStore.nodeBlocks);
const block = computed(() => codeStore.block);

const togglePreview = () => {
  showPreview.value = !showPreview.value;
};
</script>

<style scoped>
/* Smooth transitions */
.transition-transform {
  transition: transform 0.3s ease-in-out;
}
</style>
