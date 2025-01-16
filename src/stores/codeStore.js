import { defineStore } from "pinia";
import { ref } from "vue";

export const useCodeStore = defineStore("code", () => {
  const asyncCode = ref("");

  function updateCode(newCode) {
    asyncCode.value = newCode;
  }

  return { asyncCode, updateCode };
});
