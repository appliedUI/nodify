<template>
  <div class="p-0 flex h-full" ref="container">
    <div
      class="coder block rounded-lg bg-gray-900 p-4 overflow-x-auto h-full"
      :style="{ width: `${codeWidth}px` }"
    >
      <div class="text-xs text-gray-100">{{ formattedNodeCode }}</div>
    </div>
    <div
      class="resize-handle bg-gray-700 hover:bg-gray-600 w-1 h-full cursor-col-resize"
      @mousedown="startResize('params')"
    ></div>
    <div
      class="params-container bg-gray-800 p-4 overflow-x-auto h-full"
      :style="{ width: `${paramsWidth}px` }"
    >
      <ParamsComponent />
    </div>
    <div
      class="resize-handle bg-gray-700 hover:bg-gray-600 w-1 h-full cursor-col-resize"
      @mousedown="startResize('compiled')"
    ></div>
    <div
      class="compiled-container bg-gray-800 p-4 overflow-x-auto h-full"
      :style="{ width: `${compiledWidth}px` }"
    >
      <CompiledComponent />
    </div>
  </div>
</template>

<script setup>
import { useCodeStore } from "@/stores/codeStore";
import { storeToRefs } from "pinia";
import { onMounted, watch, ref } from "vue";
import ParamsComponent from "@/components/ParamsComponent.vue";
import CompiledComponent from "@/components/CompiledComponent.vue";

const codeStore = useCodeStore();
const { formattedNodeCode } = storeToRefs(codeStore);

// Width configuration variables
const MIN_CODE_WIDTH = 0.5; // Minimum width of code section (50% of window)
const MAX_CODE_WIDTH = 0.7; // Maximum width of code section (70% of window)
const MIN_PARAMS_WIDTH = 0.15; // Minimum width of params section (15% of window)
const MAX_PARAMS_WIDTH = 0.3; // Maximum width of params section (30% of window)
const MIN_COMPILED_WIDTH = 0.15; // Minimum width of compiled section (15% of window)
const MAX_COMPILED_WIDTH = 0.3; // Maximum width of compiled section (30% of window)
const INITIAL_CODE_WIDTH = 0.6; // Initial width of code section (60% of window)
const INITIAL_PARAMS_WIDTH = 0.2; // Initial width of params section (20% of window)
const INITIAL_COMPILED_WIDTH = 0.2; // Initial width of compiled section (20% of window)

const container = ref(null);
const codeWidth = ref(window.innerWidth * INITIAL_CODE_WIDTH);
const paramsWidth = ref(window.innerWidth * INITIAL_PARAMS_WIDTH);
const compiledWidth = ref(window.innerWidth * INITIAL_COMPILED_WIDTH);
let startX;
let startWidth;
let currentResizer = null;

const startResize = (type) => {
  currentResizer = type;
  startX = event.clientX;

  if (type === "params") {
    startWidth = codeWidth.value;
  } else {
    startWidth = compiledWidth.value;
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const onMouseMove = (e) => {
  const delta = e.clientX - startX;

  if (currentResizer === "params") {
    // Resize code and params sections together
    const newCodeWidth = startWidth + delta;
    codeWidth.value = Math.max(
      window.innerWidth * MIN_CODE_WIDTH,
      Math.min(window.innerWidth * MAX_CODE_WIDTH, newCodeWidth)
    );
    paramsWidth.value =
      window.innerWidth - codeWidth.value - compiledWidth.value;
  } else if (currentResizer === "compiled") {
    // Resize compiled section independently with 1:1 movement
    const newCompiledWidth = startWidth - delta; // Note the minus sign here
    compiledWidth.value = Math.max(
      window.innerWidth * MIN_COMPILED_WIDTH,
      Math.min(window.innerWidth * MAX_COMPILED_WIDTH, newCompiledWidth)
    );
    paramsWidth.value =
      window.innerWidth - codeWidth.value - compiledWidth.value;
  }
};

const onMouseUp = () => {
  currentResizer = null;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
};

// Update window resize handler to maintain proportions
const updateWidths = () => {
  const totalWidth = window.innerWidth;
  codeWidth.value = totalWidth * INITIAL_CODE_WIDTH;
  paramsWidth.value = totalWidth * INITIAL_PARAMS_WIDTH;
  compiledWidth.value = totalWidth * INITIAL_COMPILED_WIDTH;
};

onMounted(() => {
  window.addEventListener("resize", updateWidths);
  console.log("CodeComponent mounted, current code:", formattedNodeCode.value);
});

watch(
  formattedNodeCode,
  (newCode) => {
    console.log("Code updated in component:", newCode);
  },
  { immediate: true }
);
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
</style>
