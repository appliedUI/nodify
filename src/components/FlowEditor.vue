<template>
  <div class="flow-editor">
    <!-- Loading state -->
    <div v-if="isLoading" class="loading-overlay">Loading nodes...</div>

    <!-- Error state -->
    <div v-if="loadError" class="error-message">
      Error loading nodes: {{ loadError.message }}
    </div>

    <!-- Flow content -->
    <div class="flow-content">
      <VueFlow
        v-model="elements"
        :default-viewport="{ zoom: 1.1 }"
        :snap-to-grid="true"
        :snap-grid="[16, 16]"
        @dragover="onDragOver"
        @nodeClick="({ node }) => onNodeClick(node)"
        @nodeDragStop="onNodeDragStop"
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
            <div class="group-label">
              {{ nodeProps.data?.label || "Group" }}
            </div>
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
    </div>
  </div>
</template>

<script setup>
import { ref, markRaw, watch, onMounted, computed, onUnmounted } from "vue";
import { VueFlow, useVueFlow, SelectionMode, Position } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { NodeResizer } from "@vue-flow/node-resizer";
import { useCodeStore } from "@/stores/codeStore";
import nodeTypesData from "@/nodeData/nodeTypes.json";
import "@/assets/styles/flowEditor.css";
import { dbService } from "@/services/dbService";

// Constants
const GRID_SIZE = 16;
const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;
const PADDING = 100;

// Composable setup
const vueFlow = useVueFlow();
const {
  onConnect,
  addEdges,
  project,
  addNodes,
  updateNode,
  removeNodes,
  removeEdges,
} = vueFlow;
const elements = ref([]);
const selectionMode = ref(SelectionMode.Partial);
const codeStore = useCodeStore();
const isLoading = ref(false);
const loadError = ref(null);
let id = 1;

// Node types initialization
const nodeTypes = markRaw({
  resizableGroup: { template: "#node-resizableGroup" },
  ...Object.fromEntries(
    Object.entries(nodeTypesData).map(([key, value]) => {
      if (!value.template) {
        value.template = `#node-${key}`;
      }
      return [key, markRaw(value)];
    })
  ),
});

// Helper functions
const createNode = (type, position, nodeType) => ({
  id: nodeType?.id,
  type,
  label: nodeType?.label || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
  agentPrompt: nodeType?.agentPrompt || "",
  position,
  data: {
    code: nodeType?.code || "",
    nodeId: nodeType?.id,
    agentPrompt: nodeType?.agentPrompt || "",
    description: nodeType?.description || "",
    agentConfig: nodeType?.agentConfig || {},
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
      agentPrompt: node.data.agentPrompt || "",
      label: node.label,
    }))
    .filter((block) => block.code !== "");
  codeStore.updateNodeBlocks(nodeBlocks);
};

// Helper function to create a plain, serializable node object
const createSerializableNode = (node) => {
  return {
    id: node.id,
    type: node.type,
    label: node.label || "",
    code: node.data?.code || "",
    agentPrompt: node.data?.agentPrompt || "",
    position: {
      x: node.position?.x || 0,
      y: node.position?.y || 0,
    },
    description: node.data?.description || "",
    agentConfig: node.data?.agentConfig ? { ...node.data.agentConfig } : {},
  };
};

// Updated onNodeClick
const onNodeClick = async (node) => {
  try {
    codeStore.selectNode(node);
    const serializableNode = createSerializableNode(node);
    await dbService.saveNode(serializableNode);
  } catch (error) {
    console.error("Failed to update node:", error);
  }
};

// Watch the store for selection changes and highlight the matching node
watch(
  () => codeStore.selectedNodeId,
  (newId) => {
    const selectedNode = elements.value.find((el) => el.data?.nodeId === newId);
    if (selectedNode) {
      codeStore.selectNode(selectedNode);
    }
  },
  { immediate: true }
);

const addNode = async (nodeType) => {
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
    agentPrompt: nodeType.agentPrompt,
    description: nodeType.description,
    agentConfig: nodeType.agentConfig,
  });

  try {
    // Save the node to the database
    await dbService.saveNode({
      id: newNode.id,
      type: newNode.type,
      label: newNode.label,
      code: newNode.data.code,
      agentPrompt: newNode.data.agentPrompt,
      position: newNode.position,
      description: newNode.data.description,
      agentConfig: newNode.data.agentConfig,
    });

    // Add the new node and select it immediately
    elements.value = [...elements.value, newNode];
    codeStore.selectNode(newNode);
    updateCodeFromNodes();
  } catch (error) {
    console.error("Failed to save node:", error);
    // Handle error (e.g., show notification to user)
  }
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

// Load nodes on mount
onMounted(async () => {
  try {
    isLoading.value = true;
    const nodes = await codeStore.loadNodes();

    elements.value = nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      position: node.position,
      data: {
        code: node.code,
        nodeId: node.id,
        agentPrompt: node.agentPrompt,
        description: node.description,
        agentConfig: node.agentConfig,
      },
      draggable: true,
      sourcePosition: "right",
      targetPosition: "left",
    }));
  } catch (error) {
    loadError.value = error;
    console.error("Failed to load nodes:", error);
  } finally {
    isLoading.value = false;
  }
});

// Add this computed property
const showFlow = computed(() => !isLoading.value && !loadError.value);

// Updated onNodeDragStop
const onNodeDragStop = async (event) => {
  try {
    const { node } = event;
    if (!node || !node.id) {
      console.warn("Invalid node in onNodeDragStop:", event);
      return;
    }

    const serializableNode = createSerializableNode(node);
    await dbService.saveNode(serializableNode);

    console.log("Node position and label updated:", serializableNode);
  } catch (error) {
    console.error("Failed to update node position and label:", error, {
      nodeId: event?.node?.id,
      position: event?.node?.position,
    });
  }
};

// Add keyboard event handler
const handleKeyDown = (event) => {
  if (event.key === "Delete" || event.key === "Backspace") {
    const selectedNodes = elements.value.filter(
      (el) => el.selected && el.position
    );
    if (selectedNodes.length > 0) {
      // Remove nodes and their connected edges
      const nodeIds = selectedNodes.map((node) => node.id);

      // Find edges connected to these nodes
      const edgesToRemove = elements.value
        .filter((el) => !el.position)
        .filter(
          (edge) =>
            nodeIds.includes(edge.source) || nodeIds.includes(edge.target)
        )
        .map((edge) => edge.id);

      // Remove from database
      Promise.all([
        ...nodeIds.map((id) => dbService.deleteNode(id)),
        ...edgesToRemove.map((id) => dbService.deleteEdge(id)),
      ])
        .then(() => {
          // Update local state
          removeNodes(nodeIds);
          removeEdges(edgesToRemove);
          console.log("Deleted nodes and edges:", { nodeIds, edgesToRemove });
        })
        .catch((error) => {
          console.error("Failed to delete nodes/edges:", error);
        });
    }
  }
};

// Add event listeners
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
/* Empty - all styles moved to flowEditor.css */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 100;
}

.error-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: #ff4444;
  padding: 1rem;
  background: #ffebee;
  border-radius: 4px;
  margin: 1rem;
  z-index: 101;
}

.flow-editor {
  position: relative;
  width: 100%;
  height: 100%;
}

/* Ensure VueFlow container is visible */
.vue-flow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
