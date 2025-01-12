<template>
  <div class="containerMain dark bg-transparent text-white">
    <div class="headerTop z-50 dark:bg-transparent">
      <Appbar />
    </div>
    <div class="manContent">
      <slot></slot>
    </div>
    <div class="footerMain dark:bg-transparent"></div>
  </div>
</template>

<script setup>
// Import the Appbar component
import Appbar from '@/atoms/Appbar.vue'
</script>

<style scoped>
.containerMain {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 70px 1fr 20px;
  grid-auto-columns: 1fr;
  gap: 0px 0px;
  grid-auto-flow: row;
  grid-template-areas:
    'headerTop'
    'manContent'
    'footerMain';
}

.headerTop {
  grid-area: headerTop;
  background-color: transparent;
  width: 100vw;
}

.manContent {
  grid-area: manContent;
  height: calc(100vh - 90px);
}

.footerMain {
  grid-area: footerMain;
  width: 100vw;
  background-color: transparent;
}
</style>
