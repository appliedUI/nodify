import { defineStore } from "pinia";

export const useCodeStore = defineStore("code", {
  state: () => ({
    nodeCode: "",
    lastUpdateTimestamp: null,
    selectedNodeId: null, // new
    nodeBlocks: [],
    block: null, // new
    agentPrompt: "",
  }),
  actions: {
    updateNodeBlocks(blocks) {
      this.nodeBlocks = blocks;
      this.nodeCode = blocks.map((b) => b.code).join("\n\n");
      this.agentPrompt = blocks.map((b) => b.agentPrompt).join("\n\n");
      this.lastUpdateTimestamp = Date.now();
    },
    updateSelectedNodeId(id) {
      if (!id) return;

      this.selectedNodeId = id;
      // Find the corresponding block
      const selectedBlock = this.nodeBlocks.find((block) => block.id === id);
      if (selectedBlock) {
        this.nodeCode = selectedBlock.code;
        this.block = {
          ...selectedBlock, // Spread all properties including agentPrompt
          code: selectedBlock.code,
          id: selectedBlock.id,
        };
        this.lastUpdateTimestamp = Date.now();
      }
    },
    updateNodeCode(code) {
      this.nodeCode = code;
      this.lastUpdateTimestamp = Date.now();
    },
  },
  getters: {
    formattedNodeCode: (state) => {
      return state.nodeCode ? state.nodeCode.trim() : "";
    },
  },
});
