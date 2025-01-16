<template>
  <div class="code-container">
    <h3>Generated Code:</h3>
    <pre>{{ formattedNodeCode }}</pre>
  </div>
</template>

<script setup>
import { useCodeStore } from "@/stores/codeStore";
import { storeToRefs } from "pinia";
import { watch } from "vue";

const codeStore = useCodeStore();
const { formattedNodeCode } = storeToRefs(codeStore);

watch(formattedNodeCode, (newCode) => {
  console.log("Code component received:", newCode);
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
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #fff;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #eee;
}
</style>
