<template>
  <div class="code-container">
    <h3>Generated Code:</h3>
    <pre v-if="formattedNodeCode" class="code-block">{{ formattedNodeCode }}</pre>
    <div v-else class="empty-state">No code generated yet. Drop nodes to generate code.</div>
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

watch(formattedNodeCode, (newCode) => {
  console.log("Code updated in component:", newCode);
});
</script>

<style scoped>
.code-container {
  padding: 1rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-width: 800px;
  margin: 1rem auto;
  min-height: 200px;
}

.code-block {
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #fff;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #eee;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
}

.empty-state {
  color: #666;
  text-align: center;
  padding: 2rem;
}

pre {
  margin: 0;
  overflow-x: auto;
}
</style>
