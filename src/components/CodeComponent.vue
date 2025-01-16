<template>
  <div class="code-container">
    <pre>{{ code }}</pre>
  </div>
</template>

<script setup>
import { useCodeStore } from "@/stores/codeStore";
import { storeToRefs } from "pinia";

const codeStore = useCodeStore();
const { asyncCode: code } = storeToRefs(codeStore);
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
}
</style>
