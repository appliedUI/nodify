<template>
  <div class="p-0 flex h-full" ref="container">
    <div
      class="coder block rounded-lg bg-gray-900 p-0 overflow-x-auto h-full scroll-smooth"
      ref="coderContainer"
      :style="{ width: `${codeWidth}px` }"
    >
      <div class="code-block h-full" ref="monacoEditor"></div>
    </div>
    <div
      class="resize-handle bg-gray-700 hover:bg-gray-600 w-1 h-full cursor-col-resize"
      @mousedown="startResize('params')"
    ></div>
    <div
      class="params-container bg-gray-800 px-4 py-0 overflow-x-auto h-full"
      :style="{ width: `${paramsWidth}px` }"
    >
      <ParamsComponent />
    </div>
    <div
      class="resize-handle bg-gray-700 hover:bg-gray-600 w-1 h-full cursor-col-resize"
      @mousedown="startResize('compiled')"
    ></div>
    <div
      class="compiled-container bg-gray-800 px-4 py-0 overflow-x-auto h-full"
      :style="{ width: `${compiledWidth}px` }"
    >
      <CompiledComponent />
    </div>
  </div>
</template>

<script setup>
import { useCodeStore } from '@/stores/codeStore'
import { storeToRefs } from 'pinia'
import {
  onMounted,
  watch,
  ref,
  computed,
  nextTick,
  onBeforeUnmount,
  onBeforeMount,
} from 'vue'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import ParamsComponent from '@/components/ParamsComponent.vue'
import CompiledComponent from '@/components/CompiledComponent.vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

// Configure Monaco's web workers for Vite
onBeforeMount(() => {
  // @ts-ignore
  self.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === 'json') {
        return new jsonWorker()
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker()
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker()
      }
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker()
      }
      return new editorWorker()
    },
  }
})

const codeStore = useCodeStore()
const { nodeBlocks, selectedNodeId, compiledCode } = storeToRefs(codeStore)

// Add computed property for selectedBlock
const selectedBlock = computed(() => {
  if (!selectedNodeId.value) return null
  return nodeBlocks.value.find((block) => block.id === selectedNodeId.value)
})

// Update currentCode computed property
const currentCode = computed(() => {
  return selectedBlock.value?.code || ''
})

// Width configuration variables
const MIN_CODE_WIDTH = 0.3 // Minimum width for any section
const MAX_CODE_WIDTH = 0.5 // Maximum width for any section
const MIN_COMPILED_WIDTH = 0.3 // Minimum width for any section
const MAX_COMPILED_WIDTH = 0.5 // Maximum width for any section
const INITIAL_CODE_WIDTH = 0.33 // Equal width for code section
const INITIAL_PARAMS_WIDTH = 0.33 // Equal width for params section
const INITIAL_COMPILED_WIDTH = 0.33 // Equal width for compiled section

const container = ref(null)
const codeWidth = ref(window.innerWidth * INITIAL_CODE_WIDTH)
const paramsWidth = ref(window.innerWidth * INITIAL_PARAMS_WIDTH)
const compiledWidth = ref(window.innerWidth * INITIAL_COMPILED_WIDTH)
const monacoEditor = ref(null)
let editorInstance = null
let startX
let startWidth
let currentResizer = null

const startResize = (type) => {
  currentResizer = type
  startX = event.clientX

  if (type === 'params') {
    startWidth = codeWidth.value
  } else {
    startWidth = compiledWidth.value
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  const delta = e.clientX - startX

  if (currentResizer === 'params') {
    // Resize code and params sections together
    const newCodeWidth = startWidth + delta
    codeWidth.value = Math.max(
      window.innerWidth * MIN_CODE_WIDTH,
      Math.min(window.innerWidth * MAX_CODE_WIDTH, newCodeWidth)
    )
    // Calculate remaining width for params and compiled sections
    const remainingWidth = window.innerWidth - codeWidth.value
    paramsWidth.value = remainingWidth / 2
    compiledWidth.value = remainingWidth / 2
  } else if (currentResizer === 'compiled') {
    // Resize compiled section and adjust params section
    const newCompiledWidth = startWidth - delta
    compiledWidth.value = Math.max(
      window.innerWidth * MIN_COMPILED_WIDTH,
      Math.min(window.innerWidth * MAX_COMPILED_WIDTH, newCompiledWidth)
    )
    // Calculate remaining width for code and params sections
    const remainingWidth = window.innerWidth - compiledWidth.value
    codeWidth.value = remainingWidth / 2
    paramsWidth.value = remainingWidth / 2
  }
}

const onMouseUp = () => {
  currentResizer = null
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

// Update window resize handler to maintain proportions
const updateWidths = () => {
  const totalWidth = window.innerWidth
  codeWidth.value = totalWidth * INITIAL_CODE_WIDTH
  paramsWidth.value = totalWidth * INITIAL_PARAMS_WIDTH
  compiledWidth.value = totalWidth * INITIAL_COMPILED_WIDTH
}

onMounted(async () => {
  window.addEventListener('resize', updateWidths)
  await nextTick()
  await initEditor()
})

const coderContainer = ref(null)

const scrollToBlock = (id) => {
  if (!id || !coderContainer.value) return

  nextTick(() => {
    const selectedBlock = coderContainer.value.querySelector(
      `[data-block-id="${id}"]`
    )
    if (selectedBlock) {
      selectedBlock.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  })
}

// Watch for selectedNodeId changes and update editor
watch(
  selectedNodeId,
  async (newId) => {
    if (newId) {
      // Update editor with new code
      if (editorInstance) {
        const newCode = selectedBlock.value?.code || ''
        editorInstance.setValue(newCode)
        nextTick(() => {
          editorInstance.layout()
          editorInstance.focus()
        })
      }

      // Scroll to the selected block
      scrollToBlock(newId)

      // Initialize editor if it doesn't exist
      if (!editorInstance) {
        await initEditor()
      }
    }
  },
  { immediate: true }
)

// Watch for changes in currentCode and update editor
watch(
  currentCode,
  (newCode) => {
    if (editorInstance && newCode !== undefined) {
      console.log('[DEBUG] Updating editor content')
      const currentValue = editorInstance.getValue()
      if (currentValue !== newCode) {
        editorInstance.setValue(newCode)
        // Force a layout update
        nextTick(() => {
          editorInstance.layout()
          editorInstance.focus()
        })
      }
    }
  },
  { immediate: true }
)

// Update editor initialization
const initEditor = async () => {
  if (!monacoEditor.value) return

  // Ensure theme is defined
  monaco.editor.defineTheme('dark-modern', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'parameter', foreground: '9CDCFE' },
      { token: 'property', foreground: '9CDCFE' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorCursor.foreground': '#AEAFAD',
      'editor.lineHighlightBackground': '#2A2D2E',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#707070',
      'editor.selectionHighlightBorder': '#51504F',
      'editor.lineHighlightBorder': '#2A2D2E',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editorGutter.background': '#1E1E1E',
      'editorWidget.background': '#252526',
      'editorWidget.border': '#454545',
      'editorHoverWidget.background': '#252526',
      'editorHoverWidget.border': '#454545',
    },
  })

  monaco.editor.setTheme('dark-modern')

  // Create editor with initial value
  editorInstance = monaco.editor.create(monacoEditor.value, {
    value: currentCode.value,
    language: 'python',
    theme: 'dark-modern',
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 12,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
    },
    fixedOverflowWidgets: true,
    wordWrap: 'on',
  })

  // Update store when content changes
  editorInstance.onDidChangeModelContent(() => {
    const newValue = editorInstance.getValue()
    if (compiledCode.value !== newValue) {
      codeStore.updateCompiledCode(newValue)
    }
  })
}

// Cleanup editor instance
onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.dispose()
  }
})
</script>

<style scoped>
.coder {
  max-width: 100%;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.params-container,
.compiled-container {
  max-width: 100%;
  white-space: pre-wrap;
  word-wrap: break-word;
  height: 100%;
}

.resize-handle {
  cursor: col-resize;
  user-select: none;
  width: 12px;
}

.resize-handle:hover {
  background-color: #4a5568;
}

.code-block {
  height: 100%;
  width: 100%;
  min-height: 300px; /* Ensure minimum height */
}

.scroll-smooth {
  scroll-behavior: smooth;
}
</style>
