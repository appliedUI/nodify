<template>
  <div class="compiled-container">
    <div
      v-if="compiledCode"
      class="compiled-content bg-gray-800 rounded-lg"
      v-html="compiledCode"
    ></div>
    <p v-else class="text-gray-400 italic">No compiled code available yet.</p>
  </div>
</template>

<script setup>
import { useAIStore } from '../stores/aiChatStore'
import { computed, onMounted, onUpdated, watch, nextTick } from 'vue'

const store = useAIStore()
const compiledCode = computed(() => store.getLatestCode)

// Handle form submission
const handleFormSubmit = async (event) => {
  event.preventDefault()
  const form = event.target
  const formData = new FormData(form)
  const formValues = {}

  formData.forEach((value, key) => {
    formValues[key] = value
  })

  try {
    await store.handleCompileSubmit({
      formData: formValues,
      compiledCode: compiledCode.value,
    })
    console.log('Form and code submitted successfully')
  } catch (error) {
    console.error('Error submitting form and code:', error)
  }
}

// Track if listeners are attached
let listenersAttached = false

const attachFormListeners = () => {
  if (listenersAttached) return

  nextTick(() => {
    const forms = document.querySelectorAll('.compiled-content form')
    forms.forEach((form) => {
      // Only add listener if not already attached
      if (!form.__listenerAttached) {
        form.addEventListener('submit', handleFormSubmit)
        form.__listenerAttached = true // Mark as attached
      }
    })
    listenersAttached = true
  })
}

// Watch for compiledCode changes and attach event listeners
watch(compiledCode, () => {
  listenersAttached = false
  attachFormListeners()
})

// Attach listeners on component mount
onMounted(() => {
  attachFormListeners()
})

// Reset listeners on update
onUpdated(() => {
  listenersAttached = false
  attachFormListeners()
})

// Add styles for form inputs in compiled code
</script>

<style scoped>
.compiled-container {
  height: 100%;
  overflow-y: auto;
  font-size: 12px;
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
  font-size: 12px;
}

.compiled-content :deep(label) {
  font-size: 12px;
  color: #a3a3a3;
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

/* style button */
.compiled-content :deep(button) {
  background-color: #14181e;
  color: #e5e7eb;
  border: 1px solid #4b5563;
  border-radius: 0.375rem;
  padding: 0.5rem;
  margin: 0.25rem 0;
  width: 100%;
}
</style>
