<template>
  <VueFlow
    v-model="elements"
    :default-viewport="{ zoom: 1.5 }"
    @dragover="onDragOver"
    @drop="onDrop"
    class="dark"
  >
    <Background pattern-color="#4B5563" :gap="8" />
    <Controls class="!bg-gray-800 !border-gray-700" />

    <div
      class="absolute top-4 left-4 z-10 bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg"
    >
      <div
        v-for="node in nodeTypes"
        :key="node.type"
        class="draggable-node text-xs bg-gray-800 hover:bg-gray-900/50 text-gray-200 p-3 mb-2 rounded-md cursor-move transition-colors duration-200 shadow-sm"
        :draggable="true"
        @dragstart="(event) => onDragStart(event, node)"
      >
        {{ node.label }}
      </div>
    </div>
  </VueFlow>
</template>

<script setup>
import { ref } from "vue";
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
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
const codeStore = useCodeStore();

// ... rest of the methods moved from App.vue ...
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

  if (!nodeType) {
    console.warn("No node type found for:", type);
    return;
  }

  const newNode = {
    id: `node-${id}`,
    type,
    label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node ${id}`,
    position,
    draggable: true,
    data: {
      code: nodeType.code || "",
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
  addEdges([newEdge]);
});

const updateCodeFromNodes = () => {
  const codeBlocks = elements.value
    .filter((el) => el.type !== undefined)
    .map((node) => node.data?.code?.trim() || "")
    .filter((code) => code.trim() !== "")
    .join("\n\n");

  codeStore.updateNodeCode(codeBlocks);
};
</script>

<style scoped>
:deep(.vue-flow__node) {
  @apply bg-gray-800 border-gray-600 text-gray-200 shadow-lg;
}

:deep(.vue-flow__handle) {
  @apply bg-gray-600 border-gray-700;
}

:deep(.vue-flow__edge-path) {
  stroke: #4b5563;
}

:deep(.vue-flow__controls button) {
  @apply bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700;
}

:deep(.vue-flow__attribution) {
  @apply bg-transparent text-gray-500;
}

.node-toolbox {
  min-width: 200px;
}

.draggable-node {
  user-select: none;
}
</style>
