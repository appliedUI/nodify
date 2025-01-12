<template>
  <div class="notes-editor h-full flex flex-col">
    <!-- Tabs -->
    <div role="tablist" class="tabs tabs-bordered justify-start ml-6">
      <a
        role="tab"
        class="tab text-white flex items-center gap-2"
        :class="{
          'tab-active': activeTab === 'edit',
          'opacity-50 hover:opacity-75': activeTab !== 'edit',
        }"
        @click="activeTab = 'edit'"
      >
        <PencilIcon class="h-5 w-5" />
      </a>
      <a
        role="tab"
        class="tab text-white flex items-center gap-2"
        :class="{
          'tab-active': activeTab === 'preview',
          'opacity-50 hover:opacity-75': activeTab !== 'preview',
        }"
        @click="activeTab = 'preview'"
      >
        <EyeIcon class="h-5 w-5" />
      </a>
    </div>

    <!-- Content -->
    <div class="flex-1 p-4">
      <!-- Preview Section -->
      <div
        v-if="activeTab === 'preview'"
        class="h-full overflow-auto p-6 bg-white rounded-lg"
        @click="handlePreviewClick"
      >
        <vue-markdown-render
          :source="markdownContent"
          class="prose leading-relaxed"
        />
      </div>

      <!-- Editor Section -->
      <div v-if="activeTab === 'edit'" class="h-full flex flex-col">
        <div
          class="toolbar flex gap-1 p-1 bg-gray-700 rounded-t-lg pl-5 justify-between w-full items-center"
        >
          <div>
            <button
              @click="insertText('# ')"
              class="p-1 text-xs hover:bg-gray-600 rounded"
            >
              H1
            </button>
            <button
              @click="insertText('## ')"
              class="p-1 text-xs hover:bg-gray-600 rounded"
            >
              H2
            </button>
            <button
              @click="insertText('### ')"
              class="p-1 text-xs hover:bg-gray-600 rounded"
            >
              H3
            </button>
            <button
              @click="insertText('**', '**')"
              class="p-1 text-xs hover:bg-gray-600 rounded"
            >
              B
            </button>
            <button
              @click="insertText('*', '*')"
              class="p-1 text-xs hover:bg-gray-600 rounded"
            >
              I
            </button>
            <button
              @click="insertText('> ')"
              class="p-1 text-xs hover:bg-gray-600 rounded"
            >
              Quote
            </button>
            <button
              @click="insertText('[', '](url)')"
              class="p-1 text-xs hover:bg-gray-600 rounded"
            >
              Link
            </button>
            <button
              @click="insertText('- ')"
              class="p-1 text-xs hover:bg-gray-600 rounded"
            >
              List
            </button>
          </div>
          <div>
            <button
              @click="downloadPDF"
              class="p-2 hover:bg-gray-700 rounded-md transition-colors"
              title="Download as PDF"
            >
              <span class="text-xs mr-2">PDF</span>
              <ArrowDownTrayIcon
                class="w-4 h-4 text-gray-400 hover:text-white inline-block"
              />
            </button>
          </div>
        </div>
        <textarea
          v-model="markdownContent"
          class="flex-1 w-full p-6 bg-gray-800 rounded-b-lg text-white text-base focus:outline-none resize-none placeholder-gray-400 leading-loose"
          placeholder="Start typing your markdown notes here. You will be able to send content from nodes to these notes. Treat this like a scrapbook."
          spellcheck="true"
          @input="handleInput"
          ref="editor"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue'
import { useNotesStore } from '@/stores/notesStore'
import { useSubjectsStore } from '@/stores/subjectsStore'
import VueMarkdownRender from 'vue-markdown-render'
import {
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline'
import { toast } from 'vue3-toastify'
import { marked } from 'marked'

const notesStore = useNotesStore()
const subjectsStore = useSubjectsStore()
const activeTab = ref('edit')
const markdownContent = ref('')
const originalContent = ref('')
const hasUnsavedChanges = ref(false)
const autoSaveTimeout = ref(null)
const editor = ref(null)

// Computed property to check if there are unsaved changes
const hasChanges = computed(() => {
  return markdownContent.value !== originalContent.value
})

const clearContent = () => {
  markdownContent.value = ''
  originalContent.value = ''
  hasUnsavedChanges.value = false
}

const showSaveToast = () => {
  toast('Note saved', {
    theme: 'auto',
    type: 'success',
    position: 'bottom-center',
    autoClose: 800,
    transition: 'slide',
  })
}

const loadNote = async () => {
  try {
    const workspaceId = localStorage.getItem('workspaceUUID')
    if (!workspaceId) {
      clearContent()
      return
    }

    await notesStore.setCurrentWorkspace(workspaceId)
    const note = notesStore.notes[0]
    markdownContent.value = note?.content || ''
    originalContent.value = markdownContent.value
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('Error loading note:', error)
    clearContent()
  }
}

// Watch for workspace changes
watch(
  () => localStorage.getItem('workspaceUUID'),
  (newWorkspaceId) => {
    if (newWorkspaceId) {
      loadNote()
    } else {
      clearContent()
    }
  }
)

// Watch for notes store changes
watch(
  () => notesStore.notes,
  (newNotes) => {
    if (newNotes.length > 0) {
      const currentNote = newNotes[0]
      if (currentNote.content !== markdownContent.value) {
        // Keep the cursor position when updating content
        const currentCursorPos = editor.value?.selectionStart || 0
        markdownContent.value = currentNote.content
        originalContent.value = currentNote.content
        hasUnsavedChanges.value = false

        // Restore cursor position after update
        if (editor.value) {
          editor.value.setSelectionRange(currentCursorPos, currentCursorPos)
        }
      }
    }
  },
  { deep: true }
)

// Watch for content changes and schedule auto-save
watch(markdownContent, (newContent) => {
  if (newContent !== originalContent.value) {
    hasUnsavedChanges.value = true
    // Clear any existing timeout
    if (autoSaveTimeout.value) {
      clearTimeout(autoSaveTimeout.value)
    }
    autoSaveTimeout.value = setTimeout(async () => {
      if (hasUnsavedChanges.value) {
        try {
          await notesStore.saveNote(markdownContent.value)
          originalContent.value = markdownContent.value
          hasUnsavedChanges.value = false
          showSaveToast()
        } catch (error) {
          console.error('Error saving note on auto-save:', error)
          toast.error('Error saving note', {
            position: 'bottom-center',
            autoClose: 2000,
          })
        }
      }
    }, 2000)
  }
})

// Load note when component mounts
onMounted(() => {
  const workspaceId = localStorage.getItem('workspaceUUID')
  if (workspaceId) {
    loadNote()
  }
})

// Save changes before component unmounts
onBeforeUnmount(async () => {
  if (hasUnsavedChanges.value) {
    try {
      await notesStore.saveNote(markdownContent.value)
      hasUnsavedChanges.value = false
      showSaveToast()
    } catch (error) {
      console.error('Error saving note on unmount:', error)
      toast.error('Error saving note', {
        position: 'top-center',
        autoClose: 2000,
      })
    }
  }
})

const handleInput = () => {
  hasUnsavedChanges.value = true
}

const handlePreviewClick = (event) => {
  if (event.target.tagName === 'A') {
    const href = event.target.getAttribute('href')
    // Handle internal links
    if (href === '#') {
      activeTab.value = 'edit'
      event.preventDefault()
    }
    // Handle external links
    else if (href && !href.startsWith('#')) {
      event.preventDefault()
      electronAPI.openExternal(href)
    }
  }
}

function insertText(before, after = '') {
  if (!editor.value) return

  const textarea = editor.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selection = textarea.value.substring(start, end)
  const newText = before + selection + after

  textarea.value =
    textarea.value.substring(0, start) + newText + textarea.value.substring(end)

  // Update cursor position
  const newCursorPos = start + before.length
  textarea.setSelectionRange(newCursorPos, newCursorPos)

  // Trigger input event to update v-model
  const event = new Event('input', { bubbles: true })
  textarea.dispatchEvent(event)

  textarea.focus()
}

const downloadPDF = async () => {
  try {
    // Ensure markdownContent is properly defined
    if (!markdownContent.value) {
      throw new Error('No content to export')
    }

    const htmlContent = marked.parse(markdownContent.value)
    const fileName = `notes-${new Date().toISOString().slice(0, 10)}`

    const pdfPath = await window.electronAPI.downloadPdf(htmlContent, fileName)
    await window.electronAPI.openPdf(pdfPath)

    toast('PDF download complete', {
      theme: 'auto',
      type: 'info',
      position: 'bottom-center',
      autoClose: 1000,
      transition: 'slide',
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    toast.error('Error generating PDF', {
      position: 'bottom-center',
      autoClose: 2000,
    })
  }
}
</script>

<style scoped>
.notes-editor {
  z-index: 0000 !important;
  height: calc(100vh - 2rem);
}

.tab {
  border-color: rgba(244, 222, 53, 0.1) !important;
  color: rgb(148, 148, 148);
  transition: opacity 0.2s ease;
}

.tab-active {
  border-bottom: 1px solid #f48c06 !important;
  color: white;
  opacity: 1 !important;
}

.tab:hover {
  color: white;
}

textarea {
  scrollbar-width: thin;
  scrollbar-color: #4a5568 transparent;
}

textarea::-webkit-scrollbar {
  width: 8px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  background-color: #4a5568;
  border-radius: 4px;
}

textarea {
  line-height: 1.6; /* Slightly tighter for code */
}

.prose {
  background-color: white !important;
}

.prose :deep(h1, h2, h3, h4, h5, h6) {
  /* Headings */
  font-family: 'Roboto', sans-serif !important;
  font-weight: 100 !important;
  color: black !important;
}

.prose :deep(hr) {
  background-color: rgb(71, 71, 71) !important;
}

.prose :deep(pre) {
  font-family: 'Roboto', sans-serif !important;
  font-weight: 100 !important;
  background-color: rgb(225, 225, 225) !important;
  color: black !important;
}
.prose :deep(code) {
  font-family: 'Roboto', sans-serif !important;
  font-weight: 400 !important;
  background-color: rgb(225, 225, 225) !important;
  color: black !important;
}

.prose :deep(ul li) {
  color: black !important;
  list-style: disc !important;
  display: list-item !important;
}

.prose :deep(ol) {
  list-style-type: decimal !important;
  color: black !important;
}

.prose :deep(li) {
  color: black !important;
}

.prose :deep(*) {
  background-color: white !important;
  color: black !important;
}
</style>
