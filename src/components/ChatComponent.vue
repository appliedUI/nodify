<template>
  <div class="chat-container">
    <h3 class="font-bold text-gray-300 mb-4">Chat</h3>
    <div class="text-gray-400">
      <!-- Chat interface will go here -->
      <p>{{ block.agentPrompt }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useCodeStore } from "@/stores/codeStore";
import ConnectionsComponent from "./ConnectionsComponent.vue";
import ChatComponent from "./ChatComponent.vue";

const codeStore = useCodeStore();
const nodeCode = computed(() => codeStore.nodeCode);
const nodeBlocks = computed(() => codeStore.nodeBlocks);
const block = computed(() => codeStore.block);
// Chat logic will go here
</script>
