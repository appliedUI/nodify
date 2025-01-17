import { defineStore } from "pinia";

export const useCodeStore = defineStore("code", {
  state: () => ({
    nodeCode: "",
    lastUpdateTimestamp: null,
    selectedNodeId: null, // new
    nodeBlocks: [],       // new
  }),
  actions: {
    updateNodeBlocks(blocks) {
      this.nodeBlocks = blocks;
      this.nodeCode = blocks.map((b) => b.code).join("\n\n");
      this.lastUpdateTimestamp = Date.now();
    },
    updateSelectedNodeId(id) {
      this.selectedNodeId = id;
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
