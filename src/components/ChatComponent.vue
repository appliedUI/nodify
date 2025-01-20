<template>
  <div class="chat-container">
    <div class="messages-container">
      <div
        v-for="(message, index) in chatHistory"
        :key="index"
        :class="['message', message.role]"
      >
        <div class="message-content">
          <pre v-if="message.role === 'system' && message.content">{{
            message.content
          }}</pre>
          <pre
            v-else-if="
              message.role === 'assistant' &&
              message.content &&
              message.content.includes('```')
            "
          >
            {{ message.content }}
          </pre>
          <span v-else-if="message.content">{{ message.content }}</span>
          <span v-else>Empty message</span>
        </div>
        <div class="message-timestamp" v-if="message.timestamp">
          {{ formatTimestamp(message.timestamp) }}
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="isLoading" class="loading">Thinking...</div>
    </div>

    <!-- Chat input -->
    <div class="chat-input">
      <textarea
        v-model="currentMessage"
        @keydown.enter.prevent="sendMessage"
        placeholder="Ask about the code..."
      ></textarea>
      <button @click="sendMessage" :disabled="isLoading">Send</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useCodeStore } from "@/stores/codeStore";
import { useAIStore } from "@/stores/aiChatStore";

const codeStore = useCodeStore();
const aiStore = useAIStore();

const nodeCode = computed(() => codeStore.nodeCode);
const block = computed(() => codeStore.block);
const currentMessage = ref("");
const isLoading = computed(() => aiStore.isLoading);
const chatHistory = computed(() => aiStore.getChatHistory);

// Watch for node changes to initialize code review
watch(
  block,
  (newBlock) => {
    if (newBlock?.code) {
      aiStore.sendCodeReview({
        code: newBlock.code,
        agentPrompt: newBlock.agentPrompt,
      });
    }
  },
  { immediate: true }
);

const sendMessage = async () => {
  if (currentMessage.value.trim()) {
    console.log("[CLIENT] Sending message:", currentMessage.value);
    try {
      await aiStore.sendMessage(currentMessage.value);
      console.log("[CLIENT] Message sent successfully");
      currentMessage.value = "";
    } catch (error) {
      console.error("[CLIENT] Error sending message:", error);
      throw error;
    }
  }
};

const formatTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "";
  }
};

const safeChatHistory = computed(() => {
  return chatHistory.value.map((message) => ({
    role: message.role || "unknown",
    content: message.content || "",
    timestamp: message.timestamp || new Date().toISOString(),
  }));
});
</script>

<style scoped>
.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin: 0.5rem 0;
  padding: 0.5rem;
  border-radius: 4px;
}

.message.user {
  background-color: #2d3748;
  align-self: flex-end;
}

.message.assistant {
  background-color: #4a5568;
  align-self: flex-start;
}

.message-content {
  word-wrap: break-word;
}

.message-timestamp {
  font-size: 0.75rem;
  color: #a0aec0;
  margin-top: 0.25rem;
}

.loading {
  color: #a0aec0;
  font-style: italic;
  padding: 0.5rem;
}

.chat-input {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.chat-input textarea {
  flex: 1;
  padding: 0.5rem;
  background-color: #2d3748;
  color: white;
  border: none;
  border-radius: 4px;
  resize: none;
}

.chat-input button {
  padding: 0.5rem 1rem;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.chat-input button:disabled {
  background-color: #4a5568;
  cursor: not-allowed;
}
</style>
