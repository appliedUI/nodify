<template>
  <div class="app-container">
    <div class="flow-container">
      <FlowEditor />
    </div>
    <div class="code-container">
      <CodeComponent />
    </div>
  </div>
</template>

<script setup>
import FlowEditor from "@/components/FlowEditor.vue";
import CodeComponent from "@/components/CodeComponent.vue";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
</script>

<style>
.app-container {
  display: grid;
  grid-template-rows: 1fr 1fr;
  height: 100vh;
}

.flow-container {
  height: 100%;
  position: relative;
}

.code-container {
  border-top: 2px solid #ddd;
  overflow: auto;
  padding: 1rem;
}
</style>
