import { defineStore } from "pinia";

export const useCodeStore = defineStore("code", {
  state: () => ({
    asyncCode: "",
  }),
  actions: {
    updateCode(newCode) {
      this.asyncCode = newCode;
    },
  },
  getters: {
    formattedCode: (state) => {
      return state.asyncCode.trim();
    },
  },
});
