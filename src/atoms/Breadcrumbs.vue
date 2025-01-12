<template>
  <nav class="breadcrumbs p-10 w-full" aria-label="Breadcrumb">
    <ul>
      <li>
        <router-link to="/workspace" class="text-blue-400"
          >Workspace</router-link
        >
      </li>
      <li>
        <span>{{ currentPage }}</span>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import {} from 'vue'

const props = defineProps({
  currentPage: {
    type: String,
    required: true,
  },
})
</script>

<style scoped>
/* ...existing styles... */
</style>
