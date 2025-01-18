<template>
  <!-- <div class="params-container text-xs">{{ nodeCode }}</div> -->
  <div class="params-container text-xs" v-if="block">{{ block }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { useCodeStore } from '@/stores/codeStore'
const codeStore = useCodeStore()

const nodeCode = computed(() => codeStore.nodeCode)
const nodeBlocks = computed(() => codeStore.nodeBlocks)
const block = computed(() => codeStore.block)
</script>
