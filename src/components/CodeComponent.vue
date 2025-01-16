<template>
  <div class="p-0">
    <pre class="rounded-lg bg-gray-900 p-4 overflow-x-auto">
        <code class="text-xs text-gray-100">{{ formattedNodeCode }}</code>
      </pre>
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
