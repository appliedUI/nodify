import { defineStore } from "pinia";

export const useCodeStore = defineStore("code", {
  state: () => ({
    nodeCode: "",
    lastUpdateTimestamp: null,
  }),
  actions: {
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
