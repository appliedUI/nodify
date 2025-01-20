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
          <pre v-if="message.role === 'system' && message.content" 
               class="whitespace-pre-wrap">{{ message.content }}</pre>
          <pre v-else-if="message.role === 'assistant' && message.content && message.content.includes('```')"
               class="whitespace-pre-wrap">{{ message.content }}</pre>
          <span v-else-if="message.content">{{ message.content }}</span>
          <span v-else class="text-gray-400">Empty message</span>
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
import { computed, ref, watch, nextTick } from 'vue'
import { useCodeStore } from '@/stores/codeStore'
import { useAIStore } from '@/stores/aiChatStore'

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
      aiStore.sendCodeReview({
        code: newBlock.code,
        agentPrompt: newBlock.agentPrompt,
      })
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
</style>
