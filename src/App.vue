<template>
  <div class="app-container dark bg-gray-900 text-white">
    <div class="flow-container bg-gray-800">
      <FlowEditor />
    </div>
    <div class="resize-handle bg-gray-700 hover:bg-gray-600"></div>
    <div class="code-container bg-gray-800">
      <CodeComponent />
    </div>
  </div>
</template>

<script setup>
import FlowEditor from "@/components/FlowEditor.vue";
import CodeComponent from "@/components/CodeComponent.vue";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import { onMounted } from "vue";

onMounted(() => {
  const handle = document.querySelector(".resize-handle");
  const container = document.querySelector(".app-container");

  let startY;
  let startHeight;

  function onMouseDown(e) {
    startY = e.clientY;
    const gridTemplateRows = getComputedStyle(container).gridTemplateRows;
    startHeight = parseFloat(gridTemplateRows.split(" ")[0]);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(e) {
    const delta = e.clientY - startY;
    const newHeight = `${startHeight + delta}px`;
    container.style.gridTemplateRows = `${newHeight} 10px 1fr`;
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  handle.addEventListener("mousedown", onMouseDown);
});
</script>

<style>
.app-container {
  display: grid;
  grid-template-rows: 1fr 10px 1fr;
  height: 100vh;
}

.flow-container {
  height: 100%;
  position: relative;
}

.resize-handle {
  cursor: row-resize;
  position: relative;
}

.resize-handle:hover {
  background-color: #ccc;
}

.code-container {
  overflow: auto;
  padding: 1rem;
}
</style>
