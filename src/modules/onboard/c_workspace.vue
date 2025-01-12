<template>
  <div class="hero flex flex-col justify-center">
    <div class="back absolute top-[50px] left-1/2 transform -translate-x-1/2">
      <div class="cursor-pointer" @click="navBack">
        <img :src="arrowBack" alt="arrow-back" class="h-[30px] hover-scale" />
      </div>
    </div>

    <div class="instruct mt-[300px] text-xl opacity-70 text-center">
      <div class="text-4xl">
        Hi there <span class="capitalize">{{ savedUsername }}</span
        >!
      </div>
      <div class="mt-2">Name your workspace.</div>
    </div>

    <div class="enter-workspace-name mt-14 w-full flex justify-center">
      <div class="animated-border">
        <input
          type="text"
          v-model="workspaceName"
          ref="workspaceInput"
          class="my-cool-input input border border-primary focus:outline-none text-4xl text-center playwrite font-thin p-10 pb-10"
          placeholder=""
          @focus="onFocus"
          @blur="onBlur"
          @input="onInput"
          @keydown.enter.prevent="handleEnter"
        />
      </div>
    </div>

    <div class="random-name" v-if="!isFocused || !workspaceName">
      <img
        :src="currentDice"
        alt="random dice"
        class="dice-image h-[50px] cursor-pointer mt-14 hover-scale"
        :class="{ spinning: isSpinning }"
        @click="rollDice"
      />
    </div>

    <div class="check-availability" v-else>
      <button class="btn btn-info mt-14" @click="() => checkAvailability(true)">
        Check availability
      </button>
    </div>

    <div class="cta absolute bottom-[80px]">
      <div
        v-if="workspaceName && isNameValidated"
        class="cursor-pointer"
        @click="handleNavigation"
      >
        <img :src="arrowRight" alt="arrow-right" class="h-[50px] hover-scale" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import arrowBack from '@/assets/img/ar-back.svg'
import arrowRight from '@/assets/img/ar-next.svg'
import d2 from '@/assets/img/d2.svg'
import d4 from '@/assets/img/d4.svg'
import d5 from '@/assets/img/d5.svg'
import d6 from '@/assets/img/d6.svg'
import { getUniqueName } from '@/utils/generateWorkspaceNames'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'vue3-toastify'
import { db } from '@/db/db'

const savedUsername = localStorage.getItem('username')

const router = useRouter()
const nav = (path) => {
  router.push(path)
}

const diceImages = [d2, d4, d5, d6]
const currentDice = ref(d2)
const isSpinning = ref(false)
const workspaceName = ref('')
const isFocused = ref(false)
const isNameValidated = ref(false)
const workspaceInput = ref(null)

const rollDice = async () => {
  isSpinning.value = true

  let counter = 0
  const intervalId = setInterval(() => {
    currentDice.value = diceImages[counter % diceImages.length]
    counter++
  }, 100)

  setTimeout(async () => {
    clearInterval(intervalId)
    currentDice.value =
      diceImages[Math.floor(Math.random() * diceImages.length)]
    isSpinning.value = false

    try {
      const uniqueName = await getUniqueName()
      workspaceName.value = uniqueName
      isNameValidated.value = true

      // Trigger availability check for the new name
      await checkAvailability()
    } catch (error) {
      console.error('Error generating name:', error)
      toast('Error generating workspace name')
    }
  }, 1000)
}

onMounted(async () => {
  const savedUsername = localStorage.getItem('username')
  const savedWorkspaceName = localStorage.getItem('workspaceName')
  if (savedWorkspaceName) {
    workspaceName.value = savedWorkspaceName
    const workspace = await workspaceDB.getWorkspaceByName(savedWorkspaceName)
    isNameValidated.value = !!workspace
  }
  if (workspaceInput.value) {
    workspaceInput.value.focus()
  }
})

const checkWorkspaceExists = async (name) => {
  const workspace = await db.workspaces.where('name').equals(name).first()
  return !!workspace
}

const onFocus = () => {
  isFocused.value = true
}

const onBlur = async () => {
  isFocused.value = false
  await checkAvailability()
}

const onInput = () => {
  isNameValidated.value = false
  localStorage.removeItem('workspaceNameValidated')
}

//navBack
const navBack = () => {
  router.back()
}

const checkAvailability = async (showToast = true) => {
  if (!workspaceName.value) {
    if (showToast) {
      toast('Please enter a workspace name', {
        theme: 'auto',
        type: 'error',
        position: 'top-center',
        autoClose: 800,
        transition: 'slide',
      })
    }
    return
  }

  try {
    const exists = await db.workspaces
      .where('name')
      .equals(workspaceName.value)
      .first()

    if (exists) {
      const savedWorkspaceId = localStorage.getItem('workspaceUUID')
      if (exists.id.toString() === savedWorkspaceId) {
        isNameValidated.value = true
      } else {
        if (showToast) {
          toast('This workspace name is already taken', {
            theme: 'auto',
            type: 'error',
            position: 'top-center',
            autoClose: 800,
            transition: 'slide',
          })
        }
        isNameValidated.value = false
      }
    } else {
      isNameValidated.value = true
      if (showToast) {
        toast('This workspace name is available', {
          theme: 'auto',
          type: 'success',
          position: 'top-center',
          autoClose: 800,
          transition: 'slide',
        })
      }
    }
  } catch (error) {
    console.error('Error checking availability:', error)
    if (showToast) {
      toast('Error checking workspace name', {
        theme: 'auto',
        type: 'error',
        position: 'top-center',
        autoClose: 800,
        transition: 'slide',
      })
    }
    isNameValidated.value = false
  }
}

const saveWorkspaceName = async (name) => {
  try {
    // Get current user from DexieDB
    const userId = parseInt(localStorage.getItem('userUUID'))
    const currentUser = await db.users.where('id').equals(userId).first()

    if (!currentUser) {
      throw new Error('No user found')
    }

    // Create workspace
    const workspaceData = {
      name: name,
      status: 'active',
      ownerId: currentUser.id,
      createdAt: new Date(),
    }

    // Add to workspaces table
    const workspaceId = await db.workspaces.add(workspaceData)

    // Add workspace-user relationship
    await db.workspaceUsers.add({
      workspaceId: workspaceId,
      userId: currentUser.id,
      role: 'owner',
    })

    localStorage.setItem('workspaceUUID', workspaceId.toString())
    return true
  } catch (error) {
    console.error('Workspace save error:', error)
    toast('Error saving workspace name: ' + error.message)
    return false
  }
}

const handleNavigation = async () => {
  if (!workspaceName.value) {
    toast('Please enter a workspace name', {
      theme: 'auto',
      type: 'error',
      position: 'top-center',
      autoClose: 800,
      transition: 'slide',
    })
    return
  }

  if (!isNameValidated.value) {
    toast('Please check name availability first', {
      theme: 'auto',
      type: 'error',
      position: 'top-center',
      autoClose: 800,
      transition: 'slide',
    })
    return
  }

  const savedWorkspaceName = localStorage.getItem('workspaceName')
  const exists = await checkWorkspaceExists(workspaceName.value)

  if (exists) {
    if (savedWorkspaceName === workspaceName.value) {
      nav('/workspace')
    } else {
      toast('This workspace name is already taken', {
        theme: 'auto',
        type: 'error',
        position: 'top-center',
        autoClose: 800,
        transition: 'slide',
      })
    }
  } else {
    const saved = await saveWorkspaceName(workspaceName.value)
    if (saved) {
      localStorage.setItem('workspaceName', workspaceName.value)
      toast('Workspace created successfully!', {
        theme: 'auto',
        type: 'success',
        position: 'top-center',
        autoClose: 800,
        transition: 'slide',
      })
      setTimeout(() => {
        nav('/workspace') // Ensure this path is correct
      }, 1000)
    }
  }
}

const handleEnter = async () => {
  if (!workspaceName.value) {
    toast('Please enter a workspace name', {
      theme: 'auto',
      type: 'error',
      position: 'top-center',
      autoClose: 800,
      transition: 'slide',
    })
    return
  }

  await checkAvailability(false)

  if (isNameValidated.value) {
    handleNavigation()
  }
}
</script>

<style scoped>
.dice-image {
  transition: transform 0.5s cubic-bezier(0.6, 0.04, 0.98, 0.335);
}

.spinning {
  animation: spin 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.3);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}
</style>
