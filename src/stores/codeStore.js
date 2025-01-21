import { defineStore } from "pinia";
import nodeTypes from "@/nodeData/nodeTypes.json";

export const useCodeStore = defineStore("code", {
  state: () => ({
    nodeCode: "",
    lastUpdateTimestamp: null,
    selectedNodeId: null,
    nodeBlocks: [],
    block: null,
    agentPrompt: "",
    compiledCode: "",
  }),
  actions: {
    updateNodeBlocks(blocks) {
      this.nodeBlocks = blocks;
      this.lastUpdateTimestamp = Date.now();
    },
    updateSelectedNodeId(id) {
      if (!id) return;

      this.selectedNodeId = id;
      const selectedBlock = this.nodeBlocks.find((block) => block.id === id);
      if (selectedBlock) {
        this.nodeCode = selectedBlock.code;
        this.block = selectedBlock;
        this.lastUpdateTimestamp = Date.now();
      }
    },
    updateNodeCode(code) {
      this.nodeCode = code;
      if (this.block) {
        this.block.code = code;
      }
      this.lastUpdateTimestamp = Date.now();
    },
    selectNode(node) {
      if (!node) return;
      this.selectedNodeId = node.id;
      this.nodeCode = node.data?.code || "";
      this.block = {
        id: node.id,
        code: node.data?.code || "",
        ...node.data,
      };
      const nodeType = nodeTypes.find((n) => n.id === node.id);
      if (nodeType?.agentConfig) {
        this.block.agentConfig = nodeType.agentConfig;
      }
      this.lastUpdateTimestamp = Date.now();
    },
    updateCompiledCode(code) {
      this.compiledCode = code;
      this.lastUpdateTimestamp = Date.now();
    },
  },
  getters: {
    formattedNodeCode: (state) => {
      return state.nodeCode ? state.nodeCode.trim() : "";
    },
    selectedNodeCode: (state) => {
      const selectedNode = state.nodeBlocks.find(
        (block) => block.id === state.selectedNodeId
      );
      return selectedNode?.code || "";
    },
    formattedCompiledCode: (state) => {
      return state.compiledCode ? state.compiledCode.trim() : "";
    },
  },
});
