<template>
  <div class="params-container text-xs" v-if="block">
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
import { computed } from "vue";
import { useCodeStore } from "@/stores/codeStore";
const codeStore = useCodeStore();

const nodeCode = computed(() => codeStore.nodeCode);
const nodeBlocks = computed(() => codeStore.nodeBlocks);
const block = computed(() => codeStore.block);
</script>
