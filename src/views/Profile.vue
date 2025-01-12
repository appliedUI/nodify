<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import Breadcrumbs from '@/atoms/Breadcrumbs.vue'
import { AtSymbolIcon, UserIcon } from '@heroicons/vue/24/outline'
import CryptoJS from 'crypto-js'
import { useUserStore } from '@/stores/userStore'
import History from '@/modules/profile/History.vue'

const userStore = useUserStore()
const email = ref('')
const name = ref('')
const isEditingEmail = ref(false)
const isEditingName = ref(false)
const gravatarUrls = ref([])
const selectedGravatar = ref('')

const handleBreadcrumbClick = (breadcrumb) => {
  if (breadcrumb === 'workspace' && redirectedFromWorkspace.value) {
    toast('Please add an OpenAI key before returning to the workspace.', {
      theme: 'auto',
      type: 'warning',
      position: 'bottom-center',
      autoClose: 2000,
      transition: 'slide',
    })
  } else if (breadcrumb === 'workspace') {
    // Add logic to navigate to the workspace
  }
}

const saveEmail = async () => {
  if (email.value) {
    try {
      await userStore.updateUser({ email: email.value })
      gravatarUrls.value = [
        `https://www.gravatar.com/avatar/${CryptoJS.MD5(
          email.value
        ).toString()}?d=identicon`,
        `https://www.gravatar.com/avatar/${CryptoJS.MD5(
          email.value
        ).toString()}?d=wavatar`,
      ]
      selectedGravatar.value =
        gravatarUrls.value[
          Math.floor(Math.random() * gravatarUrls.value.length)
        ]
      isEditingEmail.value = false
    } catch (error) {
      console.error('Failed to update email:', error)
      // You might want to show an error toast here
    }
  }
}

const saveName = async () => {
  if (name.value) {
    try {
      await userStore.updateUser({ name: name.value })
      isEditingName.value = false
    } catch (error) {
      console.error('Failed to update name:', error)
      // You might want to show an error toast here
    }
  }
}

onMounted(async () => {
  const userData = await userStore.fetchUser()
  if (userData) {
    email.value = userData.email
    name.value = userData.name
    if (userData.email) {
      gravatarUrls.value = [
        `https://www.gravatar.com/avatar/${CryptoJS.MD5(
          userData.email
        ).toString()}?d=identicon`,
        `https://www.gravatar.com/avatar/${CryptoJS.MD5(
          userData.email
        ).toString()}?d=wavatar`,
      ]
      selectedGravatar.value =
        gravatarUrls.value[
          Math.floor(Math.random() * gravatarUrls.value.length)
        ]
    }
  } else {
    isEditingEmail.value = true
  }
})

const handleMouseMove = (event) => {
  const { clientX, clientY, currentTarget } = event
  const { offsetWidth, offsetHeight } = currentTarget
  const xPos = (clientX / offsetWidth) * 100
  const yPos = (clientY / offsetHeight) * 100
  currentTarget.style.setProperty('--bg-pos', `${xPos}% ${yPos}%`)
}
</script>

<template>
  <MainLayout>
    <div class="p-4">
      <Breadcrumbs
        class="z-100"
        :currentPage="'Profile'"
        @breadcrumb-click="handleBreadcrumbClick"
      />
    </div>
    <div class="p-4 relative top-[-60px]">
      <div
        class="flex flex-col items-center justify-center relative top-[-20px]"
      >
        <div
          class="bg-none rounded-[23px] relative top-14 flex flex-row items-center justify-center"
        >
          <template v-if="selectedGravatar">
            <div class="interactive-border" @mousemove="handleMouseMove">
              <img
                :src="selectedGravatar"
                alt="Gravatar"
                class="w-[170px] h-[170px] rounded-full"
              />
            </div>
          </template>
          <template v-else>
            <UserIcon class="w-32 h-32 text-gray-400" />
          </template>
        </div>
        <div
          class="bg-base-100 rounded-[23px] pt-[100px] pb-11 flex flex-row gap-9 items-center justify-center w-full max-w-4xl mx-auto"
        >
          <div class="flex flex-row items-center justify-start shrink-0">
            <UserIcon class="w-6 h-6 text-white mr-3" />
            <div
              v-if="!isEditingName"
              @click="isEditingName = true"
              class="text-[#ffffff] text-left font-['NunitoSans-Regular',_sans-serif] text-sm font-normal flex items-center justify-start cursor-pointer hover:underline"
            >
              {{ name || 'Add your name here' }}
            </div>
            <input
              v-else
              v-model="name"
              @blur="saveName"
              @keyup.enter="saveName"
              type="text"
              placeholder="Add your name here"
              class="text-[#ffffff] text-left font-['NunitoSans-Regular',_sans-serif] text-sm font-normal flex items-center justify-start bg-transparent border-b border-white focus:outline-none"
            />
          </div>
          <div class="flex flex-row items-center justify-start shrink-0">
            <AtSymbolIcon class="w-6 h-6 text-white mr-3" />
            <div
              v-if="!isEditingEmail"
              @click="isEditingEmail = true"
              class="text-[#ffffff] text-left font-['NunitoSans-Regular',_sans-serif] text-sm font-normal flex items-center justify-start cursor-pointer hover:underline"
            >
              {{ email || 'Add your email here' }}
            </div>
            <input
              v-else
              v-model="email"
              @blur="saveEmail"
              @keyup.enter="saveEmail"
              type="email"
              placeholder="Add your email here"
              class="text-[#ffffff] text-left font-['NunitoSans-Regular',_sans-serif] text-sm font-normal flex items-center justify-start bg-transparent border-b border-white focus:outline-none"
            />
          </div>
        </div>
      </div>
      <History />
    </div>
  </MainLayout>
</template>

<style scoped>
.interactive-border::before {
  background-position: var(--bg-pos, 50% 50%);
}
</style>
