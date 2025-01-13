<template>
  <div class="pdf-upload-container">
    <div
      class="drop-zone"
      :class="{ 'drag-active': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <input
        type="file"
        accept="application/pdf"
        @change="handleFileChange"
        class="hidden-input"
        id="pdf-upload"
      />
      <label for="pdf-upload" class="upload-label">
        <p class="text-gray-500 text-xs">
          Drag & drop a PDF file or
          <span class="text-blue-500 cursor-pointer"
            ><br />
            Click to Browse</span
          >
        </p>
        <p v-if="file" class="text-xs text-gray-600 truncate">
          <span class="text-gray-500 truncate w-[100px]"> {{ file.name }}</span>
        </p>
        <p v-if="errorMessage" class="text-sm text-red-500 mt-2">
          {{ errorMessage }}
        </p>
      </label>
    </div>
    <div class="flex mx-5">
      <button
        @click="processFile(file)"
        :disabled="!file || processing || !subjectsStore.selectedSubjectId"
        class="btn btn-secondary btn-sm w-full"
      >
        <span v-if="!subjectsStore.selectedSubjectId">Select a Subject First</span>
        <span v-else>{{ processing ? 'Processing...' : 'Process PDF' }}</span>
      </button>
    </div>
    <div v-if="errorMessage" class="mt-2 mx-5 text-sm text-error">
      {{ errorMessage }}
    </div>

    <!-- <div v-if="isLoading" class="mt-2 text-sm text-gray-500">
      Processing PDF... ({{ pdfStore.processingProgress?.percent || 0 }}%)
    </div> -->
  </div>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import { usePDFStore } from '@/stores/pdfStore'
import { useSubjectsStore } from '@/stores/subjectsStore'

// Initialize stores
const pdfStore = usePDFStore()
const subjectsStore = useSubjectsStore()

// Get subject ID from localStorage and watch for changes
const selectedSubjectId = ref(localStorage.getItem('selectedSubjectId') || null)

// Watch for subject changes in the store
watch(
  () => subjectsStore.selectedSubjectId,
  (newId) => {
    selectedSubjectId.value = newId
    localStorage.setItem('selectedSubjectId', newId)
  },
  { immediate: true }
)

// Reactive state
const isLoading = ref(false)
const processing = ref(false)
const file = ref(null)
const isDragging = ref(false)
const errorMessage = ref('')

const handleFileChange = (e) => {
  const selectedFile = e.target.files[0]
  if (selectedFile) {
    validateAndSetFile(selectedFile)
  }
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const droppedFile = e.dataTransfer.files[0]
  if (droppedFile) {
    validateAndSetFile(droppedFile)
  }
}

const validateAndSetFile = (fileToValidate) => {
  if (fileToValidate.type === 'application/pdf') {
    file.value = fileToValidate
    errorMessage.value = ''
    // Emit event or handle file upload here
  } else {
    errorMessage.value = 'Please upload a valid PDF file'
  }
}

const handleDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const processFile = async (fileToProcess) => {
  if (!fileToProcess || fileToProcess.type !== 'application/pdf') {
    errorMessage.value = 'Please upload a valid PDF file'
    return
  }

  if (!subjectsStore.selectedSubjectId) {
    errorMessage.value = 'Please select a subject first'
    return
  }

  try {
    processing.value = true
    isLoading.value = true
    errorMessage.value = ''

    console.log('[PDF Upload] Starting PDF processing for subject:', subjectsStore.selectedSubjectId)
    const markdown = await pdfStore.processPDF(fileToProcess, subjectsStore.selectedSubjectId)

    console.log('[PDF Upload] PDF processing completed')
    file.value = fileToProcess
    errorMessage.value = ''
  } catch (error) {
    console.error('[PDF Upload] Error:', error)
    errorMessage.value = error.message || 'Failed to process PDF'
  } finally {
    processing.value = false
    isLoading.value = false
  }
}

const processPDF = async () => {
  if (!file.value || !selectedSubjectId.value) return

  try {
    processing.value = true
    const encryptedApiKey = await encryptData(apiKey)
    const markdown = await pdfStore.processPDF(
      file.value,
      selectedSubjectId.value,
      encryptedApiKey
    )
    // Emit event when processing is complete
    emit('pdf-processed', {
      subjectId: selectedSubjectId.value,
      markdown,
    })
  } catch (error) {
    console.error('Error processing PDF:', error)
    errorMessage.value = 'Failed to process PDF'
  } finally {
    processing.value = false
  }
}

const isProcessed = computed(() => {
  return pdfStore.markdownContent !== null && !pdfStore.isProcessing
})
</script>

<style scoped>
.pdf-upload-container {
  @apply w-full max-w-sm mx-auto;
}

.drop-zone {
  border: 1px dashed #373737;
  border-radius: 5px;
  padding: 10px;
  text-align: center;
  margin: 20px;
  height: 50px;
}

.drag-active {
  @apply border-blue-500 bg-blue-50;
}

.hidden-input {
  @apply hidden;
}

.upload-label {
  @apply cursor-pointer flex flex-col items-center;
}
</style>
