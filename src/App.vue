<template>
  <div class="app-container">
    <div class="flow-container">
      <VueFlow
        v-model="elements"
        :default-viewport="{ zoom: 1.5 }"
        @dragover="onDragOver"
        @drop="onDrop"
      >
        <Background pattern-color="#aaa" :gap="8" />
        <Controls />

        <div class="node-toolbox">
          <div
            v-for="node in nodeTypes"
            :key="node.type"
            class="draggable-node"
            :draggable="true"
            @dragstart="(event) => onDragStart(event, node)"
          >
            {{ node.label }}
          </div>
        </div>
      </VueFlow>
    </div>

    <div class="code-container">
      <CodeComponent />
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import CodeComponent from "@/components/CodeComponent.vue";
import { useCodeStore } from "@/stores/codeStore";

const { onConnect, addEdges, project } = useVueFlow();

const nodeTypes = [
  {
    type: "input",
    label: "Input Node",
    code: "const input = await getInput();",
  },
  {
    type: "output",
    label: "Output Node",
    code: "return processResult(result);",
  },
  {
    type: "operation",
    label: "Operation Node",
    code: "const result = await processData(data);",
  },
  {
    type: "condition",
    label: "Condition Node",
    code: "if (condition) {\n  // do something\n}",
  },
];

const elements = ref([]);
let id = 1;

const vueFlowRef = ref(null);

const codeStore = useCodeStore();

const onDragStart = (event, node) => {
  event.dataTransfer.setData("application/vueflow", node.type);
  event.dataTransfer.effectAllowed = "move";
};

const onDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const onDrop = (event) => {
  const type = event.dataTransfer.getData("application/vueflow");
  const position = project({ x: event.clientX, y: event.clientY });
  const nodeType = nodeTypes.find((n) => n.type === type);

  const newNode = {
    id: `node-${id}`,
    type,
    label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node ${id}`,
    position,
    draggable: true,
    data: {
      code: nodeType.code,
    },
  };

  id++;
  elements.value = [...elements.value, newNode];
  updateCodeFromNodes();
};

onConnect((params) => {
  const newEdge = {
    id: `edge-${params.source}-${params.target}`,
    source: params.source,
    target: params.target,
    animated: true,
    style: { stroke: "#555", strokeWidth: 2 },
  };

  // Use addEdges to ensure reactivity
  addEdges([newEdge]);
});

const updateCodeFromNodes = () => {
  const codeBlocks = elements.value
    .filter((el) => el.type === "node")
    .map((node) => node.data?.code || "")
    .join("\n\n");

  console.log("Sending node code to store:", codeBlocks);
  codeStore.updateNodeCode(codeBlocks);
};

// Example of updating the code
</script>

<style>
/* Add these styles */
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
