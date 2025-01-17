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
    :pan-on-drag="false"
    :selection-on-drag="true"
    :nodes-draggable="true"
    :nodes-connectable="true"
    :elements-selectable="true"
    :selection-mode="selectionMode"
    :zoom-on-double-click="false"
    :pan-on-scroll="false"
    :node-types="nodeTypes"
  >
    <template #node-resizableGroup="nodeProps">
      <div :style="nodeProps.style">
        <div class="group-label">{{ nodeProps.data?.label || "Group" }}</div>
        <NodeResizer
          :min-width="200"
          :min-height="100"
          :is-visible="true"
          :enable-top-left="false"
          :enable-top-right="false"
          :enable-bottom-left="false"
          :enable-bottom-right="true"
          :enable-edge-resize="false"
          :line-style="{ stroke: 'none' }"
        />
      </div>
    </template>
    <Background pattern-color="#4B5563" :gap="8" />
    <Controls class="!bg-gray-800 !border-gray-700" />
    <div>
      <button
        @click="nestSelectedNodes"
        class="absolute top-4 right-4 z-10 bg-gray-800 rounded-lg border border-gray-700 shadow-lg px-4 py-2 text-gray-200 hover:bg-gray-900/50 transition-colors duration-200"
      >
        Nest Selected Nodes
      </button>
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
import { ref, markRaw } from "vue";
import { VueFlow, useVueFlow, SelectionMode, Position } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { NodeResizer } from "@vue-flow/node-resizer";
import { useCodeStore } from "@/stores/codeStore";
import nodeTypesData from "@/nodeData/nodeTypes.json";

const vueFlow = useVueFlow();
const { onConnect, addEdges, project, addNodes, updateNode } = vueFlow;
const getNodes = () => vueFlow.getNodes();

const elements = ref([]);
let id = 1;
const codeStore = useCodeStore();

const selectionMode = ref(SelectionMode.Partial);

const nodeTypes = markRaw({
  resizableGroup: {
    template: "#node-resizableGroup",
  },
  ...Object.entries(nodeTypesData).reduce((acc, [key, value]) => {
    acc[key] = markRaw(value);
    return acc;
  }, {}),
});

const onDragStart = (event, node) => {
  event.dataTransfer.setData("application/vueflow", node.type);
  event.dataTransfer.effectAllowed = "move";
};

const onDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const onDrop = (event) => {
  const type = event.dataTransfer.getData("application/vueflow") || "default";
  const { x, y } = project({ x: event.clientX, y: event.clientY });
  const nodeType = nodeTypesData.find((n) => n.type === type);

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
    zIndex: 2, // Set zIndex higher to ensure visibility with grouped nodes
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
    x: lastNode ? lastNode.position.x + 180 : 200,
    y: lastNode ? lastNode.position.y : 40,
  };

  const newNode = {
    id: `node-${id}`,
    type: nodeType?.type || "default",
    label: `${
      (nodeType?.type || "default").charAt(0).toUpperCase() +
      (nodeType?.type || "default").slice(1)
    }`,
    position,
    draggable: true,
    data: {
      code: nodeType?.code || "",
    },
    sourcePosition: "right",
    targetPosition: "left",
  };

  id++;
  elements.value = [...elements.value, newNode];
  updateCodeFromNodes();
};

const nestSelectedNodes = () => {
  try {
    // Only get actual nodes, not edges
    const selectedNodes = elements.value.filter(
      (el) => el.selected && el.position && el.type !== "resizableGroup"
    );

    if (selectedNodes.length < 2) {
      console.warn("Select at least 2 nodes to nest");
      return;
    }

    // Get all edges
    const edges = elements.value
      .filter((el) => !el.position)
      .map((edge) => ({
        ...edge,
        zIndex: 2, // Set edges to be above nodes
      }));

    // Get non-selected nodes (excluding edges)
    const nonSelectedNodes = elements.value.filter(
      (el) => el.position && (!el.selected || el.type === "resizableGroup")
    );

    // Fixed padding for consistent spacing
    const PADDING = 100;
    const DEFAULT_NODE_WIDTH = 150;
    const DEFAULT_NODE_HEIGHT = 50;

    // Calculate the bounding box
    const minX = Math.min(...selectedNodes.map((node) => node.position.x));
    const minY = Math.min(...selectedNodes.map((node) => node.position.y));
    const maxX = Math.max(
      ...selectedNodes.map(
        (node) =>
          node.position.x + (node.dimensions?.width || DEFAULT_NODE_WIDTH)
      )
    );
    const maxY = Math.max(
      ...selectedNodes.map(
        (node) =>
          node.position.y + (node.dimensions?.height || DEFAULT_NODE_HEIGHT)
      )
    );

    // Create parent group node with calculated dimensions
    const width = maxX - minX + PADDING;
    const height = maxY - minY + PADDING;

    const groupNode = {
      id: `group-${id}`,
      type: "resizableGroup",
      position: { x: minX - PADDING / 2, y: minY - PADDING / 2 },
      style: {
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 0,
      },
      data: {
        label: "Group",
        childNodes: selectedNodes.map((node) => node.id),
      },
      draggable: true,
      selectable: true,
      dimensions: {
        width,
        height,
      },
      zIndex: 0,
    };

    // Update positions of child nodes relative to the group
    selectedNodes.forEach((node) => {
      node.parentNode = groupNode.id;
      node.extent = "parent";
      node.position = {
        x: node.position.x - minX + PADDING / 2,
        y: node.position.y - minY + PADDING / 2,
      };
      node.selected = false;
      node.zIndex = 1;
    });

    // Update elements array with proper ordering
    elements.value = [
      ...edges, // Put edges first to ensure proper connection rendering
      ...nonSelectedNodes,
      groupNode,
      ...selectedNodes,
    ];
    id++;
  } catch (error) {
    console.error("Error in nestSelectedNodes:", error);
  }
};

const onNodeDragStop = (event, node) => {
  // Your drag stop logic here
  console.log("Node drag stopped:", node);
};
</script>

<style scoped>
@import "@vue-flow/node-resizer/dist/style.css";

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

:deep(.vue-flow__node.group-node) {
  min-width: 100px;
  min-height: 100px;
  box-sizing: border-box;
  border: 1px solid rgba(16, 185, 129, 0.5);
  background-color: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  padding: 20px;
}

:deep(.vue-flow__node.group-node:hover) {
  border: 1px solid rgba(16, 185, 129, 0.8);
}

:deep(.vue-flow__node.group-node.selected) {
  border-color: rgba(16, 185, 129, 1);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
}

.group-node {
  position: relative;
  min-width: 200px;
  min-height: 100px;
  background: transparent;
}

.group-label {
  position: absolute;
  top: -25px;
  left: 10px;
  font-size: 12px;
  color: #cccccc;
  background: rgba(3, 3, 3, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 1;
}

.group-resizer {
  border-color: #666 !important;
}

.group-resizer .handle {
  background: #fff;
  border: 1px solid #666;
  width: 8px;
  height: 8px;
}

.pan-toggle-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.pan-toggle-button:hover {
  background: #f7fafc;
}

.pan-toggle-button.active {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

:deep(.vue-flow__node.resizableGroup) {
  min-width: 100px;
  min-height: 100px;
  box-sizing: border-box;
  border: 1px solid rgba(16, 185, 129, 0.5);
  background-color: rgba(16, 185, 129, 0.1);
  border-radius: 8px;
  padding: 20px;
  position: relative;
}

:deep(.vue-flow__node.resizableGroup:hover) {
  border: 1px solid rgba(16, 185, 129, 0.8);
}

:deep(.vue-flow__node.resizableGroup.selected) {
  border-color: rgba(16, 185, 129, 1);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
}

:deep(.vue-flow__resize-control) {
  display: none; /* Hide all resize controls by default */
}

:deep(.vue-flow__resize-control.bottom.right) {
  display: block; /* Only show bottom-right resize control */
  bottom: -4px !important;
  right: -4px !important;
  border: 1px solid #666 !important;
  border-radius: 2px !important;
  background: #fff !important;
  width: 8px !important;
  height: 8px !important;
  position: absolute !important;
  z-index: 1;
}

/* Remove or comment out the top-left control styles since we don't need them */
/* :deep(.vue-flow__resize-control.top.left) {
  top: -4px !important;
  left: -4px !important;
} */

:deep(.vue-flow__edge) {
  z-index: 0;
}

:deep(.vue-flow__node) {
  z-index: 1;
}

:deep(.vue-flow__node.resizableGroup) {
  z-index: 0;
  pointer-events: all;
}
</style>
