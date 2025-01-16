<template>
  <div class="p-0">
    <div class="coder block rounded-lg bg-gray-900 p-4 overflow-x-auto">
      <div class="text-xs text-gray-100">{{ formattedNodeCode }}</div>
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
.coder {
  max-width: 100%;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
