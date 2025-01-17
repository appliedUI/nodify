<template>
  <VueFlow
    v-model="elements"
    :default-viewport="{ zoom: 1.1 }"
    :snap-to-grid="true"
    :snap-grid="[16, 16]"
    @dragover="onDragOver"
    @drop="onDrop"
    class="dark"
    selection-key="Control"
    multi-selection-key="Shift"
    :pan-on-drag="[1, 2]"
    :selection-on-drag="true"
    :nodes-draggable="true"
    :nodes-connectable="true"
    :elements-selectable="true"
    :selection-mode="selectionMode"
    :zoom-on-double-click="false"
    :pan-on-scroll="true"
  >
    <Background pattern-color="#4B5563" :gap="8" />
    <Controls class="!bg-gray-800 !border-gray-700" />
    <div>
      <div
        class="absolute top-4 left-4 z-10 bg-gray-800 rounded-lg border border-gray-700 shadow-lg"
        style="max-height: calc(300px); overflow-y: auto"
      >
        <div
          v-for="node in nodeTypes"
          :key="node.type"
          class="draggable-node text-xs bg-gray-800 hover:bg-gray-900/50 text-gray-200 mb-2 rounded-md cursor-move transition-colors duration-200 shadow-sm"
          :draggable="true"
          @dragstart="(event) => onDragStart(event, node)"
          @click="addNode(node)"
        >
          {{ node.label }}
        </div>
      </div>
    </div>
  </VueFlow>
</template>

<script setup>
import { ref } from "vue";
import { VueFlow, useVueFlow, SelectionMode } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { useCodeStore } from "@/stores/codeStore";
import nodeTypes from "@/nodeData/nodeTypes.json";

const { onConnect, addEdges, project } = useVueFlow();

const elements = ref([]);
let id = 1;
const codeStore = useCodeStore();

const selectionMode = ref(SelectionMode.Partial);

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
  const { x, y } = project({ x: event.clientX, y: event.clientY });
  const nodeType = nodeTypes.find((n) => n.type === type);

  if (!nodeType) {
    console.warn("No node type found for:", type);
    return;
  }

  // Snap position to grid
  const snapToGrid = (pos, gridSize) => Math.round(pos / gridSize) * gridSize;
  const position = {
    x: snapToGrid(x, 16),
    y: snapToGrid(y, 16),
  };

  const newNode = {
    id: `node-${id}`,
    type,
    label: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
    position,
    draggable: true,
    data: {
      code: nodeType.code || "",
    },
    sourcePosition: "right",
    targetPosition: "left",
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

const addNode = (nodeType) => {
  const lastNode = elements.value[elements.value.length - 1];
  const position = {
    x: lastNode ? lastNode.position.x + 180 : 200, // Place to the right of last node
    y: lastNode ? lastNode.position.y : 40, // Same Y position as last node
  };

  const newNode = {
    id: `node-${id}`,
    type: nodeType.type,
    label: `${nodeType.type.charAt(0).toUpperCase() + nodeType.type.slice(1)}`,
    position,
    draggable: true,
    data: {
      code: nodeType.code || "",
    },
    sourcePosition: "right",
    targetPosition: "left",
  };

  id++;
  elements.value = [...elements.value, newNode];
  updateCodeFromNodes();
};
</script>

<style scoped>
:deep(.vue-flow__node) {
  @apply bg-gray-800 border-gray-600 text-gray-200 shadow-lg;
}

:deep(.vue-flow__node.selected) {
  @apply border-blue-400; /* Selection border color */
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.5); /* Optional glow effect */
}

:deep(.vue-flow__handle) {
  @apply border-gray-700;
  width: 10px;
  height: 10px;
}

:deep(.vue-flow__handle.source) {
  @apply bg-green-500;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
}

:deep(.vue-flow__handle.target) {
  @apply bg-blue-500;
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
}

:deep(.vue-flow__edge-path) {
  stroke: #0b8bcb; /* Bright blue color for edges */
  stroke-width: 2;
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

:deep(.vue-flow__selection) {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.5);
  pointer-events: none;
}

:deep(.vue-flow__selection-rect) {
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.5);
  pointer-events: none;
}
</style>
