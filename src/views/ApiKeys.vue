<template>
  <MainLayout>
    <div class="p-4">
      <Breadcrumbs
        :currentPage="'API Keys'"
        @breadcrumb-click="handleBreadcrumbClick"
      />
      <div class="w-full space-y-4">
        <OpenAIKeyInput />
        <YouTubeKeyInput />
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CryptoJS from 'crypto-js'
import MainLayout from '@/layouts/MainLayout.vue'
import Breadcrumbs from '@/atoms/Breadcrumbs.vue'
import { toast } from 'vue3-toastify'
import OpenAIKeyInput from '@/atoms/OpenAIKeyInput.vue' // Ensure this path is correct
import YouTubeKeyInput from '@/atoms/YouTubeKeyInput.vue'

const redirectedFromWorkspace = ref(false)

const handleBreadcrumbClick = (breadcrumb) => {
  if (breadcrumb === 'workspace' && redirectedFromWorkspace.value) {
    toast('Please add an OpenAI key before returning to the workspace.', {
      theme: 'auto',
      type: 'warning',
      position: 'bottom-center',
      autoClose: 2000,
      transition: 'slide',
    })
  }
}

onMounted(() => {
  redirectedFromWorkspace.value =
    localStorage.getItem('redirected_from_workspace') === 'true'
  if (redirectedFromWorkspace.value) {
    localStorage.removeItem('redirected_from_workspace')
  }
})
</script>

<style scoped></style>
