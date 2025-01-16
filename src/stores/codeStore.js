import { defineStore } from "pinia";

export const useCodeStore = defineStore("code", {
  state: () => ({
    nodeCode: "",
  }),
  actions: {
    updateNodeCode(code) {
      console.log("Received node code:", code);
      this.nodeCode = code;
    },
  },
  getters: {
    formattedNodeCode: (state) => {
      return state.nodeCode.trim();
    },
  },
});
