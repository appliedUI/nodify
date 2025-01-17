<template>
  <VueFlow
    v-model="elements"
    :default-viewport="{ zoom: 1.1 }"
    :snap-to-grid="true"
    :snap-grid="[16, 16]"
    @dragover="onDragOver"
    @nodeClick="onNodeClick"
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
import { ref, markRaw, watch } from "vue";
import { VueFlow, useVueFlow, SelectionMode, Position } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { NodeResizer } from "@vue-flow/node-resizer";
import { useCodeStore } from "@/stores/codeStore";
import nodeTypesData from "@/nodeData/nodeTypes.json";
import "@/assets/styles/flowEditor.css";

// Constants
const GRID_SIZE = 16;
const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;
const PADDING = 100;

// Composable setup
const vueFlow = useVueFlow();
const { onConnect, addEdges, project, addNodes, updateNode } = vueFlow;
const elements = ref([]);
const selectionMode = ref(SelectionMode.Partial);
const codeStore = useCodeStore();
let id = 1;

// Node types initialization
const nodeTypes = markRaw({
  resizableGroup: { template: "#node-resizableGroup" },
  ...Object.fromEntries(
    Object.entries(nodeTypesData).map(([key, value]) => [key, markRaw(value)])
  ),
});

// Helper functions
const createNode = (type, position, nodeType) => ({
  id: nodeType?.id, // <-- use nodeType's UUID
  type,
  label: nodeType?.label || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
  position,
  data: {
    code: nodeType?.code || "",
    nodeId: nodeType?.id, // store the UUID again
  },
  draggable: true,
  sourcePosition: "right",
  targetPosition: "left",
});

const snapToGrid = (pos) => Math.round(pos / GRID_SIZE) * GRID_SIZE;

const updateCodeFromNodes = () => {
  const nodeBlocks = elements.value
    .filter((el) => el.type && el.data?.nodeId)
    .map((node) => ({
      id: node.data.nodeId,
      code: node.data.code.trim() || "",
    }))
    .filter((block) => block.code !== "");
  codeStore.updateNodeBlocks(nodeBlocks);
};

// Listen for node clicks and update selectedNodeId
function onNodeClick(event, node) {
  codeStore.updateSelectedNodeId(node.data.nodeId);
}

// Watch the store for selection changes and highlight the matching node
watch(
  () => codeStore.selectedNodeId,
  (newId) => {
    elements.value.forEach((el) => {
      if (el.type) {
        el.selected = el.data?.nodeId === newId;
      }
    });
  }
);

const addNode = (nodeType) => {
  const lastNode = elements.value[elements.value.length - 1];
  const position = {
    x: lastNode ? lastNode.position.x + 180 : 200,
    y: lastNode ? lastNode.position.y : 40,
  };

  const newNode = createNode(nodeType.type, position, {
    id: nodeType.id,
    label: nodeType.label,
    code: nodeType.code,
    type: nodeType.type,
  });

  elements.value = [...elements.value, newNode];
  updateCodeFromNodes();
};

const nestSelectedNodes = () => {
  try {
    const selectedNodes = elements.value.filter(
      (el) => el.selected && el.position && el.type !== "resizableGroup"
    );

    if (selectedNodes.length < 2) {
      console.warn("Select at least 2 nodes to nest");
      return;
    }

    const edges = elements.value
      .filter((el) => !el.position)
      .map((edge) => ({ ...edge, zIndex: 2 }));

    const nonSelectedNodes = elements.value.filter(
      (el) => el.position && (!el.selected || el.type === "resizableGroup")
    );

    // Calculate bounding box
    const positions = selectedNodes.map((node) => node.position);
    const dimensions = selectedNodes.map(
      (node) =>
        node.dimensions || {
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
        }
    );

    const minX = Math.min(...positions.map((pos) => pos.x));
    const minY = Math.min(...positions.map((pos) => pos.y));
    const maxX = Math.max(
      ...positions.map((pos, i) => pos.x + dimensions[i].width)
    );
    const maxY = Math.max(
      ...positions.map((pos, i) => pos.y + dimensions[i].height)
    );

    const width = maxX - minX + PADDING;
    const height = maxY - minY + PADDING;

    const groupNode = {
      id: `group-${id++}`,
      type: "resizableGroup",
      position: { x: minX - PADDING / 2, y: minY - PADDING / 2 },
      style: { width: `${width}px`, height: `${height}px`, zIndex: 0 },
      data: {
        label: "Group",
        childNodes: selectedNodes.map((node) => node.id),
      },
      draggable: true,
      selectable: true,
      dimensions: { width, height },
      zIndex: 0,
    };

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

    elements.value = [
      ...edges,
      ...nonSelectedNodes,
      groupNode,
      ...selectedNodes,
    ];
  } catch (error) {
    console.error("Error in nestSelectedNodes:", error);
  }
};

onConnect((params) => {
  addEdges([
    {
      id: `edge-${params.source}-${params.target}`,
      source: params.source,
      target: params.target,
      animated: true,
      style: { stroke: "#555", strokeWidth: 2 },
      zIndex: 2,
    },
  ]);
});

const onDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};
</script>

<style scoped>
/* Empty - all styles moved to flowEditor.css */
</style>
