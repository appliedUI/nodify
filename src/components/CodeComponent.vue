<template>
  <div class="p-0 flex h-full">
    <div
      class="coder block rounded-lg bg-gray-900 p-4 overflow-x-auto w-3/5 h-full"
    >
      <div class="text-xs text-gray-100">{{ formattedNodeCode }}</div>
    </div>
    <div
      class="resize-handle bg-gray-700 hover:bg-gray-600 w-1 h-full cursor-row-resize"
    ></div>
    <div class="params-container w-1/5 bg-gray-800 p-4 overflow-x-auto h-full">
      <ParamsComponent />
    </div>
    <div
      class="resize-handle bg-gray-700 hover:bg-gray-600 w-1 h-full cursor-row-resize"
    ></div>
    <div
      class="compiled-container w-1/5 bg-gray-800 p-4 overflow-x-auto h-full"
    >
      <CompiledComponent />
    </div>
  </div>
</template>

<script setup>
import { useCodeStore } from "@/stores/codeStore";
import { storeToRefs } from "pinia";
import { onMounted, watch } from "vue";
import ParamsComponent from "@/components/ParamsComponent.vue";
import CompiledComponent from "@/components/CompiledComponent.vue";

const codeStore = useCodeStore();
const { formattedNodeCode } = storeToRefs(codeStore);

onMounted(() => {
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
  cursor: row-resize;
}
</style>
