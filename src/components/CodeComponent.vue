<template>
  <div class="h-full dark:bg-gray-800">
    <div
      class="flex justify-between items-center p-4 border-b dark:border-gray-700"
    >
      <h2 class="text-sm font-semibold dark:text-gray-200">Code Output</h2>
    </div>
    <div class="p-4">
      <pre class="rounded-lg bg-gray-900 p-4 overflow-x-auto">
        <code class="text-xs text-gray-100">{{ formattedNodeCode }}</code>
      </pre>
    </div>
  </div>
</template>

<script setup>
import { useCodeStore } from "@/stores/codeStore";
import { storeToRefs } from "pinia";
import { onMounted, watch } from "vue";

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
pre {
  margin: 0;
  overflow-x: auto;
}
</style>
