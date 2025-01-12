<template>
  <div class="main-container">
    <div
      class="close cursor-pointer absolute top-[50px] left-1/2 transform -translate-x-1/2"
      @click="closeApp"
    >
      <img
        :src="close"
        alt=""
        class="hover-scale red-hover"
        @error="handleImageError"
        @load="handleImageLoad('close')"
      />
    </div>
    <div class="hero flex flex-col h-screen justify-center items-center">
      <div class="logo">
        <img
          :src="logo"
          alt="logo"
          class="h-[190px] cursor-pointer"
          @error="handleImageError"
          @load="handleImageLoad('logo')"
          @click="nav('/b_name')"
        />
      </div>

      <div class="logoText">
        <img
          :src="logoText"
          alt="logoText"
          class="h-[84px] mt-[20px]"
          @error="handleImageError"
          @load="handleImageLoad('logoText')"
        />
      </div>

      <div
        class="tagline font-thin text-[28px] opacity-70 flex justify-center mt-[100px] text-center sm:w-full w-3/4 text-white/80"
      >
        <div>Note-taking at the speed of thought</div>
      </div>

      <div
        class="cursor-pointer absolute bottom-[80px]"
        @click="nav('/b_name')"
      >
        <img
          :src="arrowRight"
          alt="arrow-right"
          class="h-[50px] hover-scale"
          @error="handleImageError"
          @load="handleImageLoad('arrowRight')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Import assets directly
import logoSrc from '@/assets/img/icon-sm.svg'
import logoTextSrc from '@/assets/img/logo.svg'
import arrowRightSrc from '@/assets/img/ar-next.svg'
import closeSrc from '@/assets/img/close.svg'

function debugLog(...args) {
  console.log('[Hero Debug]', ...args)
}

// Use the imported assets directly
const logo = logoSrc
const logoText = logoTextSrc
const arrowRight = arrowRightSrc
const close = closeSrc

// Log the resolved URLs
debugLog('Asset URLs:', {
  logo,
  logoText,
  arrowRight,
  close,
})

debugLog('Import Meta URL:', import.meta.url)
debugLog('Environment:', {
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  base: import.meta.env.BASE_URL,
})

const router = useRouter()
const nav = (path) => {
  router.push(path)
}

const handleImageError = (event) => {
  debugLog('Image failed to load:', {
    src: event.target.src,
    naturalWidth: event.target.naturalWidth,
    naturalHeight: event.target.naturalHeight,
    error: event.error,
  })
}

const handleImageLoad = (imageName) => {
  debugLog('Image loaded successfully:', imageName)
}

// Close the Electron app
const closeApp = () => {
  window.electronAPI.closeApp()
}

onMounted(async () => {
  debugLog('Component mounted')
  const workspaceUUID = localStorage.getItem('workspaceUUID')
  const workspaceName = localStorage.getItem('workspaceName')

  if (workspaceUUID && workspaceName) {
    router.push('/workspace')
  }
})
</script>

<style scoped></style>
