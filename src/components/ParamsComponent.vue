<template>
  <div class="params-container text-xs" v-if="block">
    <!-- Tab System -->
    <div
      class="chat-input-tabs text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700"
    >
      <ul class="flex flex-wrap -mb-px">
        <li class="me-2">
          <button
            @click="activeTab = 'chat'"
            :class="{
              'text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500':
                activeTab === 'chat',
              'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300':
                activeTab !== 'chat',
            }"
            class="inline-block p-1 border-b-2 rounded-t-lg transition-all duration-200"
          >
            Chat
          </button>
        </li>
        <li class="me-2">
          <button
            @click="activeTab = 'connections'"
            :class="{
              'text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500':
                activeTab === 'connections',
              'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300':
                activeTab !== 'connections',
            }"
            class="inline-block p-1 border-b-2 rounded-t-lg transition-all duration-200"
          >
            Connections
          </button>
        </li>
      </ul>
    </div>

    <!-- Tab Content -->
    <div class="mt-4">
      <div v-if="activeTab === 'connections'" class="fade-in">
        <ConnectionsComponent />
      </div>
      <div v-if="activeTab === 'chat'" class="fade-in">
        <ChatComponent />
      </div>
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

const activeTab = ref("chat"); // Default to chat tab
</script>

<style scoped>
.fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.transition-all {
  transition: all 0.2s ease-in-out;
}
</style>
