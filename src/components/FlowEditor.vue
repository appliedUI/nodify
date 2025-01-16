<template>
  <VueFlow
    v-model="elements"
    :default-viewport="{ zoom: 1.5 }"
    @dragover="onDragOver"
    @drop="onDrop"
    class="dark"
  >
    <Background pattern-color="#4B5563" :gap="8" />
    <Controls />

    <div class="node-toolbox">
      <div
        v-for="node in nodeTypes"
        :key="node.type"
        class="draggable-node bg-gray-700 hover:bg-gray-600 p-2 mb-2 rounded cursor-move"
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
    .map((node) => node.data?.code || "")
    .filter((code) => code.trim() !== "")
    .join("\n\n");

  codeStore.updateNodeCode(codeBlocks);
};
</script>
