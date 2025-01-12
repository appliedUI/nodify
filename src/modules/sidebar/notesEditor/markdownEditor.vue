<template>
  <div class="container">
    <div class="toolbar">
      <button @click="insertText('# ')">H1</button>
      <button @click="insertText('## ')">H2</button>
      <button @click="insertText('### ')">H3</button>
      <button @click="insertText('**', '**')">B</button>
      <button @click="insertText('*', '*')">I</button>
      <button @click="insertText('> ')">Quote</button>
      <button @click="insertText('[', '](url)')">Link</button>
      <button @click="insertText('- ')">List</button>
      <button @click="window.print()">Print</button>
    </div>
    <div class="editor-container">
      <div class="editor-section">
        <textarea
          v-model="markdownContent"
          id="editor"
          placeholder="Write your markdown here..."
          @input="handleInput"
        ></textarea>
      </div>
      <div class="preview-section">
        <div id="preview" v-html="compiledMarkdown"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useNotesStore } from '@/stores/notesStore'
import { marked } from 'marked'

const notesStore = useNotesStore()
const markdownContent = ref('')

// Initialize markdown parser
marked.setOptions({
  breaks: true,
  gfm: true,
})

const compiledMarkdown = computed(() => {
  if (!markdownContent.value) return ''
  try {
    return marked(markdownContent.value)
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return `<div class="error">Error parsing markdown: ${error.message}</div>`
  }
})

// Load initial content from store
onMounted(async () => {
  const workspaceId = localStorage.getItem('workspaceUUID')
  if (workspaceId) {
    await notesStore.setCurrentWorkspace(workspaceId)
    if (notesStore.notes.length > 0) {
      markdownContent.value = notesStore.notes[0].content || ''
    }
  }

  // Ensure preview is properly rendered
  nextTick(() => {
    const preview = document.getElementById('preview')
    if (preview) {
      preview.scrollTop = 0
    }
  })
})

// Watch for store changes
watch(
  () => notesStore.notes,
  (newNotes) => {
    if (newNotes.length > 0 && newNotes[0].content !== markdownContent.value) {
      markdownContent.value = newNotes[0].content
    }
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.editor-container {
  display: flex;
  flex: 1;
  gap: 1rem;
  height: calc(100% - 40px);
}

.editor-section,
.preview-section {
  flex: 1;
  height: 100%;
  overflow: auto;
}

#editor {
  width: 100%;
  height: 100%;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  resize: none;
}

#preview {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background-color: white;
  overflow: auto;
  height: 100%;
}

.error {
  color: #dc2626;
  padding: 1rem;
  background-color: #fef2f2;
  border-radius: 0.375rem;
  margin: 1rem 0;
}
</style>
