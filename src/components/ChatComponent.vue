<template>
  <div class="chat-container flex flex-col h-full">
    <!-- Messages container with ref -->
    <div
      ref="messagesContainer"
      class="messages-container flex-1 overflow-y-auto p-4 space-y-4"
    >
      <div
        v-for="(message, index) in chatHistory"
        :key="index"
        :class="[
          'message rounded-lg p-3',
          message.role === 'user' ? 'bg-gray-700 ml-auto' : 'bg-gray-800',
          message.role === 'assistant' ? 'mr-auto' : '',
          'max-w-[85%]',
        ]"
      >
        <div class="message-content text-sm">
          <!-- Assistant message with JSON content -->
          <template
            v-if="
              message.role === 'assistant' &&
              typeof message.content === 'object'
            "
          >
            <!-- Main message with type styling -->
            <div
              :class="['message-type', `type-${message.content.type}`]"
              class="mb-2"
            >
              {{ message.content.message }}
            </div>
            <!-- Details list without JSON formatting -->
            <ul v-if="message.content.details?.length" class="mt-2 space-y-2">
              <li
                v-for="(detail, idx) in message.content.details"
                :key="idx"
                class="markdown-content"
                v-html="renderMarkdown(detail)"
              ></li>
            </ul>
          </template>

          <!-- Other message types -->
          <template v-else>
            <pre v-if="message.role === 'system'" class="whitespace-pre-wrap">{{
              message.content
            }}</pre>
            <span v-else>{{ message.content }}</span>
          </template>
        </div>
        <div class="message-timestamp text-xs text-gray-400 mt-1">
          {{ formatTimestamp(message.timestamp) }}
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="isLoading" class="loading text-gray-400 italic px-3 py-2">
        Thinking...
      </div>
    </div>

    <!-- Fixed chat input at bottom -->
    <div class="chat-input-container bg-gray-900 border-t border-gray-700 p-4">
      <div class="flex gap-2">
        <textarea
          v-model="currentMessage"
          @keydown.enter.prevent="sendMessage"
          @keydown.shift.enter="handleNewLine"
          placeholder="Ask about the code..."
          class="flex-1 bg-gray-800 text-gray-200 rounded-lg p-2 min-h-[40px] max-h-[120px] resize-y focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          rows="1"
          aria-label="Chat input"
          :disabled="isLoading"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="isLoading || !currentMessage.trim()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors h-[42px]"
          aria-label="Send message"
        >
          <svg
            v-if="isLoading"
            class="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span v-else>Send</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, provide } from "vue";
import { useCodeStore } from "@/stores/codeStore";
import { useAIStore } from "@/stores/aiChatStore";
import MarkdownIt from "markdown-it";
import highlightjs from "highlight.js";

// Initialize markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && highlightjs.getLanguage(lang)) {
      try {
        return highlightjs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ""; // use external default escaping
  },
});

// Add markdown rendering function
const renderMarkdown = (content) => {
  if (!content) return "";
  return md.render(content);
};

const codeStore = useCodeStore();
const aiStore = useAIStore();

const nodeCode = computed(() => codeStore.nodeCode);
const block = computed(() => codeStore.block);
const currentMessage = ref("");
const isLoading = computed(() => aiStore.isLoading);
const chatHistory = computed(() => aiStore.getChatHistory);

const messagesContainer = ref(null);

const scrollToBottom = async () => {
  await nextTick();
  const lastMessage = messagesContainer.value?.querySelector(
    ".message:last-child"
  );
  if (lastMessage) {
    lastMessage.scrollIntoView({ behavior: "smooth" });
  }
};

// Watch chat history for changes
watch(
  chatHistory,
  async () => {
    await scrollToBottom();
  },
  { deep: true, immediate: true }
);

// Watch for node changes to initialize code review
watch(
  block,
  (newBlock) => {
    if (newBlock?.code) {
      const reviewData = {
        code: newBlock.code,
        agentPrompt: newBlock.agentPrompt,
        agentConfig: newBlock.agentConfig,
        label: newBlock.label,
      };

      console.log("[CLIENT] Initiating code review with data:", reviewData);
      aiStore.sendCodeReview(reviewData);
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
      await scrollToBottom(); // Scroll after sending message
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

// Provide the latest code content to be consumed by CompiledComponent
provide(
  "compiledCode",
  computed(() => {
    const lastAssistantMessage = chatHistory.value
      .filter(
        (msg) => msg.role === "assistant" && typeof msg.content === "object"
      )
      .pop();
    return lastAssistantMessage?.content?.code || "";
  })
);

const handleNewLine = (event) => {
  const textarea = event.target;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  // Insert newline at cursor position
  currentMessage.value =
    currentMessage.value.substring(0, start) +
    "\n" +
    currentMessage.value.substring(end);

  // Move cursor to after the newline
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  });
};
</script>

<style scoped></style>
