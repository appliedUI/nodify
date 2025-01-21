<template>
  <div class="chat-container flex flex-col h-full">
    <!-- Messages container with ref -->
    <div ref="messagesContainer" class="messages-container flex-1 overflow-y-auto p-4 space-y-4">
      <div
        v-for="(message, index) in chatHistory"
        :key="index"
        :class="[
          'message rounded-lg p-3',
          message.role === 'user' ? 'bg-gray-700 ml-auto' : 'bg-gray-800',
          message.role === 'assistant' ? 'mr-auto' : '',
          'max-w-[85%]'
        ]"
      >
        <div class="message-content text-sm">
          <!-- Assistant message with JSON content -->
          <template v-if="message.role === 'assistant' && typeof message.content === 'object'">
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
            <pre v-if="message.role === 'system'" class="whitespace-pre-wrap">{{ message.content }}</pre>
            <span v-else>{{ message.content }}</span>
          </template>
        </div>
        <div class="message-timestamp text-xs text-gray-400 mt-1">
          {{ formatTimestamp(message.timestamp) }}
        </div>
      </div>

      <!-- Loading indicator -->
      <div v-if="isLoading" 
           class="loading text-gray-400 italic px-3 py-2">
        Thinking...
      </div>
    </div>

    <!-- Fixed chat input at bottom -->
    <div class="chat-input-container bg-gray-900 border-t border-gray-700 p-4">
      <div class="flex gap-2">
        <textarea
          v-model="currentMessage"
          @keydown.enter.prevent="sendMessage"
          placeholder="Ask about the code..."
          class="flex-1 bg-gray-800 text-gray-200 rounded-lg p-2 min-h-[40px] max-h-[120px] resize-y"
          rows="1"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="isLoading"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useCodeStore } from '@/stores/codeStore'
import { useAIStore } from '@/stores/aiChatStore'
import MarkdownIt from 'markdown-it'
import highlightjs from 'highlight.js'

// Initialize markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && highlightjs.getLanguage(lang)) {
      try {
        return highlightjs.highlight(str, { language: lang }).value
      } catch (__) {}
    }
    return '' // use external default escaping
  }
})

// Add markdown rendering function
const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}

const codeStore = useCodeStore()
const aiStore = useAIStore()

const nodeCode = computed(() => codeStore.nodeCode)
const block = computed(() => codeStore.block)
const currentMessage = ref('')
const isLoading = computed(() => aiStore.isLoading)
const chatHistory = computed(() => aiStore.getChatHistory)

const messagesContainer = ref(null)

const scrollToBottom = async () => {
  await nextTick()
  const lastMessage = messagesContainer.value?.querySelector('.message:last-child')
  if (lastMessage) {
    lastMessage.scrollIntoView({ behavior: 'smooth' })
  }
}

// Watch chat history for changes
watch(chatHistory, async () => {
  await scrollToBottom()
}, { deep: true, immediate: true })

// Watch for node changes to initialize code review
watch(
  block,
  (newBlock) => {
    if (newBlock?.code) {
      const reviewData = {
        code: newBlock.code,
        agentPrompt: newBlock.agentPrompt,
        agentConfig: newBlock.agentConfig,
        label: newBlock.label
      };
      
      console.log('[CLIENT] Initiating code review with data:', reviewData);
      aiStore.sendCodeReview(reviewData);
    }
  },
  { immediate: true }
)

const sendMessage = async () => {
  if (currentMessage.value.trim()) {
    console.log('[CLIENT] Sending message:', currentMessage.value)
    try {
      await aiStore.sendMessage(currentMessage.value)
      console.log('[CLIENT] Message sent successfully')
      currentMessage.value = ''
      await scrollToBottom() // Scroll after sending message
    } catch (error) {
      console.error('[CLIENT] Error sending message:', error)
      throw error
    }
  }
}

const formatTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleTimeString()
  } catch (error) {
    console.error('Error formatting timestamp:', error)
    return ''
  }
}

const safeChatHistory = computed(() => {
  return chatHistory.value.map((message) => ({
    role: message.role || 'unknown',
    content: message.content || '',
    timestamp: message.timestamp || new Date().toISOString(),
  }))
})
</script>

<style scoped>
.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.messages-container {
  scrollbar-width: thin;
  scrollbar-color: #4A5568 #2D3748;

}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: #2D3748;
}

.messages-container::-webkit-scrollbar-thumb {
  background-color: #4A5568;
  border-radius: 4px;
}

.message {
  transition: all 0.2s ease-in-out;
}

.message:hover {
  transform: translateY(-1px);
}

.chat-input-container {
  position: sticky;
  bottom: 0;
  width: 100%;
  background-color: #1a1a1a;
}

textarea {
  line-height: 1.5;
  overflow-y: auto;
}

textarea:focus {
  outline: none;
  ring: 2px solid #3B82F6;
}

.message-type {
  font-weight: 500;
  white-space: pre-line; /* Preserve line breaks in the message */
}

.type-info {
  color: #3B82F6;
}

.type-warning {
  color: #F59E0B;
}

.type-error {
  color: #EF4444;
}

.type-success {
  color: #10B981;
}

.markdown-content :deep(pre) {
  background-color: #1a1a1a;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.markdown-content :deep(code) {
  background-color: #2d3748;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.markdown-content :deep(a) {
  color: #3B82F6;
  text-decoration: underline;
}

.markdown-content :deep(ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
}

.markdown-content :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #4A5568;
  padding-left: 1rem;
  margin: 1rem 0;
  color: #9CA3AF;
}

.markdown-content :deep(p) {
  margin: 0.5rem 0;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-weight: 600;
  margin: 1rem 0 0.5rem 0;
}
</style>
