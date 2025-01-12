<template>
  <div class="flex flex-col h-full items-center justify-center mx-[100px]">
    <div class="card bg-base-100 shadow-xl w-full">
      <div class="card-body">
        <form @submit.prevent="saveKey" class="flex flex-col gap-4">
          <div class="flex items-center gap-4">
            <div class="flex-none w-[25%]">
              <h2 class="text-xl font-semibold">Add OpenAI Key</h2>
            </div>
            <div class="flex-1">
              <input
                v-model="apiKey"
                type="password"
                placeholder="Enter your Open API key"
                class="input input-bordered w-full bg-base-200"
                required
              />
            </div>
            <div class="flex-none">
              <button type="submit" class="btn btn-primary">Save Key</button>
            </div>
          </div>
        </form>
      </div>
    </div>
    <div class="card bg-base-100 shadow-xl w-full mt-4 p-5">
      <div class="flex justify-between items-center pb-3">
        <label class="text-base font-medium">Encryption Status</label>
        <div class="flex items-center gap-2">
          <!-- <div class="badge badge-success" v-if="keyInitialized">Active</div>
          <div class="badge badge-warning" v-else>Initializing</div> -->
          <button
            v-if="keyInitialized"
            @click="regenerateEncryptionKey"
            class="btn btn-sm"
          >
            <ArrowPathRoundedSquareIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="bg-base-200 rounded-lg p-4">
        <div class="flex justify-between gap-2">
          <div class="flex items-center gap-2">
            <div
              class="w-4 h-4 rounded-full"
              :class="{
                'bg-success': encryptionHash,
                'bg-warning': !encryptionHash,
              }"
            ></div>
            <span class="text-sm">Encryption Key Status</span>
          </div>
          <div class="text-xs text-base-content/70" v-if="encryptionHash">
            Key ID: {{ maskSensitiveData(encryptionHash) }}
          </div>
          <div class="text-xs" v-if="encryptionHash">
            <span class="text-success">✓</span> Ready for secure operations
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
//import refresh icon from heroicons
import { ArrowPathRoundedSquareIcon } from '@heroicons/vue/24/outline'

const ENCRYPTION_KEY = 'encryption_key'
const ENCRYPTION_KEY_STATUS = 'encryption_key_status' // Add missing constant
const OPENAI_KEY = 'openai_key' // New constant for storing the actual key
import { useSubjectsStore } from '@/stores/subjectsStore'

const subjectsStore = useSubjectsStore()

const apiKey = ref('')
const message = ref('')
const decryptedKey = ref('')
const encryptedKey = ref('')
const encryptionHash = ref('')
const keyInitialized = ref(false)

const maskedDecryptedKey = computed(() => {
  if (decryptedKey.value.length <= 5) {
    return decryptedKey.value
  }
  const maskedLength = decryptedKey.value.length - 5
  return 'x'.repeat(maskedLength) + decryptedKey.value.slice(-5)
})

const maskedEncryptedKey = computed(() => {
  if (encryptedKey.value.length <= 5) {
    return encryptedKey.value
  }
  const maskedLength = encryptedKey.value.length - 5
  return 'x'.repeat(maskedLength) + decryptedKey.value.slice(-5)
})

const maskSensitiveData = (data) => {
  if (!data) return ''
  const prefix = data.slice(0, 4)
  const suffix = data.slice(-4)
  return `${prefix}...${suffix}`
}

let isMounted = true

const router = useRouter()
const redirectedFromWorkspace = ref(false)

const saveKey = async () => {
  try {
    // Get the stored encryption key or create a new one
    let storedKey = localStorage.getItem(ENCRYPTION_KEY)
    if (!storedKey) {
      storedKey = await window.electronAPI.getOrCreateEncryptionKey()
      localStorage.setItem(ENCRYPTION_KEY, storedKey)
    }

    // Encrypt the OpenAI API key with our stored encryption key
    const encrypted = await window.electronAPI.encryptData(apiKey.value)
    localStorage.setItem(OPENAI_KEY, encrypted)
    encryptedKey.value = encrypted
    subjectsStore.setOpenAIKey(true)
    message.value = 'API key has been saved and encrypted locally.'
    toast('API key has been encrypted', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      autoClose: 500,
      transition: 'slide',
    })
    setTimeout(async () => {
      if (isMounted) {
        const storedEncrypted = localStorage.getItem('openai_key')
        if (storedEncrypted) {
          decryptedKey.value = await window.electronAPI.decryptData(
            storedEncrypted
          )
          console.log('Decrypted API Key:', decryptedKey.value)
          //update store
        }
        if (redirectedFromWorkspace.value) {
          router.push('/workspace')
        }
      }
    }, 3000)
  } catch (error) {
    console.error('Error saving API key:', error)
    toast('Failed to save API key.', {
      theme: 'auto',
      type: 'error',
      position: 'bottom-center',
      autoClose: 2000,
      transition: 'slide',
    })
  }
}

const initializeEncryptionKey = async () => {
  try {
    const storedKey = localStorage.getItem(ENCRYPTION_KEY)
    if (storedKey) {
      encryptionHash.value = storedKey
      keyInitialized.value = true
      await window.electronAPI.setEncryptionKey(storedKey)
      return
    }

    const hash = await window.electronAPI.getOrCreateEncryptionKey()
    if (hash) {
      encryptionHash.value = hash
      localStorage.setItem(ENCRYPTION_KEY, hash)
      keyInitialized.value = true
      await window.electronAPI.setEncryptionKey(hash)
      toast('Encryption key initialized', {
        theme: 'auto',
        type: 'success',
        position: 'bottom-center',
        autoClose: 2000,
        icon: '🔒',
      })
    } else {
      throw new Error('Failed to initialize encryption key')
    }
  } catch (error) {
    console.error('Error initializing encryption:', error)
    toast('Failed to initialize encryption', {
      theme: 'auto',
      type: 'error',
      position: 'bottom-center',
      autoClose: 2000,
    })
  }
}

const regenerateEncryptionKey = async () => {
  try {
    const hash = await window.electronAPI.generateHash()
    if (hash) {
      encryptionHash.value = hash
      localStorage.setItem(ENCRYPTION_KEY, hash) // Update stored key
      toast('Encryption key regenerated successfully', {
        theme: 'auto',
        type: 'success',
        position: 'bottom-center',
        autoClose: 2000,
        icon: '🔒',
      })
    } else {
      throw new Error('Failed to regenerate hash')
    }
  } catch (error) {
    console.error('Error regenerating key:', error)
    toast('Failed to regenerate encryption key', {
      theme: 'auto',
      type: 'error',
      position: 'bottom-center',
      autoClose: 2000,
    })
  }
}

onMounted(async () => {
  try {
    await initializeEncryptionKey()

    // Load existing OpenAI key if available
    const storedOpenAIKey = localStorage.getItem(OPENAI_KEY)
    if (storedOpenAIKey) {
      encryptedKey.value = storedOpenAIKey
    }

    apiKey.value = localStorage.getItem('openai_key') || ''
    redirectedFromWorkspace.value =
      localStorage.getItem('redirected_from_workspace') === 'true'
    if (redirectedFromWorkspace.value) {
      localStorage.removeItem('redirected_from_workspace')
    }
  } catch (error) {
    console.error('Error in onMounted:', error)
  }
})

onUnmounted(() => {
  isMounted = false
})
</script>

<style scoped>
/* ...existing styles... */
</style>
