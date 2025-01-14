<template>
  <div class="flex justify-between items-center p-4 bg-black">
    <img :src="logo" alt="Logo" class="h-[50px] ml-7 mt-2" />
    <div class="relative" ref="dropdownRef">
      <div class="flex items-center -mt-1">
        <!-- Use EditableWorkspaceName component -->
        <EditableWorkspaceName
          :workspace-name="localWorkspaceName"
          @update:workspace-name="updateWorkspaceName"
        />
        <button
          class="btn btn-circle btn-black bg-black"
          @click="toggleDropdown"
        >
          <EllipsisHorizontalCircleIcon class="h-6 w-6" />
        </button>
      </div>
      <ul
        v-if="isDropdownVisible"
        class="menu p-2 shadow bg-base-100 rounded-box w-52 mt-2 absolute right-0 z-50"
      >
        <li v-for="item in menuItems" :key="item.label">
          <a
            @click.prevent="item.action"
            href="#"
            class="flex items-center gap-5"
          >
            <component :is="item.icon" class="h-5 w-5" />
            {{ item.label }}
          </a>
        </li>
      </ul>
    </div>
  </div>

  <!-- Add Export Choice Modal -->
  <dialog id="export_modal" class="modal modal-bottom sm:modal-middle">
    <form method="dialog" class="modal-box">
      <h3 class="font-bold text-lg mb-4">Choose Export Type</h3>
      <div class="flex flex-col gap-4">
        <button class="btn btn-outline" @click="exportSubject">
          <ArrowUpCircleIcon class="h-5 w-5 mr-2" />
          Export Current Subject
        </button>
        <button class="btn btn-outline" @click="exportWorkspace">
          <ArrowUpCircleIcon class="h-5 w-5 mr-2" />
          Export Entire Workspace
        </button>
      </div>
    </form>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import EditableWorkspaceName from '@/atoms/EditableWorkspaceName.vue'
import { db } from '@/db/db'
import DbLookupService from '@/utils/dbLookupService'
import eventBus from '@/utils/eventBus'
// Add Firebase imports

import logo from '@/assets/img/logo.svg'
import profile from '@/assets/img/icon-profile.svg'
import { useRouter } from 'vue-router'
import { useSubjectsStore } from '../stores/subjectsStore'
import { exportSubjectData, importSubjectData } from '../utils/subjectExporter'
import {
  exportWorkspaceData,
  importWorkspaceData,
} from '../utils/workspaceExporter'
import {
  UserCircleIcon,
  CommandLineIcon,
  CheckIcon,
  StarIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  BookOpenIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  EllipsisHorizontalCircleIcon,
  HomeIcon, // Add HomeIcon import
  PowerIcon,
  UserIcon, // Add PowerIcon import
} from '@heroicons/vue/24/outline'
import { toast } from 'vue3-toastify'

const router = useRouter()
const subjectsStore = useSubjectsStore()

const isDropdownVisible = ref(false)
const dropdownRef = ref(null)

const localWorkspaceName = ref('')
const localUserName = ref('')

// Add window type check
const electronAPI = window.electronAPI

// Replace the existing 'Save & Export' menu item with this:
const menuItems = [
  {
    label: 'New Workspace', // New Home item
    icon: StarIcon,
    action: () => {
      localStorage.removeItem('workspaceName')
      localStorage.removeItem('workspaceUUID')
      router.push('/c_workspace')
      isDropdownVisible.value = false
    },
  },
  {
    label: 'All Workspaces', // New Home item
    icon: BookOpenIcon,
    action: () => {
      router.push('/workspaces')
      isDropdownVisible.value = false
    },
  },
  {
    label: 'Profile', // New Home item
    icon: UserIcon,
    action: () => {
      router.push('/profile')
      isDropdownVisible.value = false
    },
  },
  {
    label: 'Save & Export',
    icon: ArrowUpCircleIcon,
    action: () => {
      document.getElementById('export_modal').showModal()
      isDropdownVisible.value = false
    },
  },
  {
    label: 'Import',
    icon: ArrowDownCircleIcon,
    action: async () => {
      try {
        // First ask user to select import type
        const importChoice = await new Promise((resolve) => {
          const modal = document.createElement('dialog')
          modal.className = 'modal modal-bottom sm:modal-middle'
          modal.innerHTML = `
            <form method="dialog" class="modal-box">
              <h3 class="font-bold text-lg mb-4">Choose Import Type</h3>
              <div class="flex flex-col gap-4">
                <button class="btn btn-outline" value="subject">
                  <ArrowDownCircleIcon class="h-5 w-5 mr-2" />
                  Import Subject
                </button>
                <button class="btn btn-outline" value="workspace">
                  <ArrowDownCircleIcon class="h-5 w-5 mr-2" />
                  Import Workspace
                </button>
              </div>
            </form>
            <form method="dialog" class="modal-backdrop">
              <button>close</button>
            </form>
          `
          modal.addEventListener('close', () => {
            resolve(modal.returnValue)
            modal.remove()
          })
          document.body.appendChild(modal)
          modal.showModal()
        })

        if (!importChoice) return // User cancelled

        if (importChoice === 'subject') {
          const workspaceId = localStorage.getItem('workspaceUUID')
          if (!workspaceId) {
            toast.error('Please select a workspace first')
            return
          }

          const result = await electronAPI.importSubjectFromFile()
          if (result.success) {
            const subjectId = await importSubjectData(
              parseInt(workspaceId),
              result.data
            )
            if (subjectId) {
              toast.success('Subject imported successfully')
              await subjectsStore.fetchSubjects()
            }
          } else {
            toast.error('Failed to import subject')
          }
        } else if (importChoice === 'workspace') {
          const result = await electronAPI.importWorkspaceFromFile()
          if (result.success) {
            const workspaceId = await importWorkspaceData(result.data)
            if (workspaceId) {
              toast.success('Workspace imported successfully')
              router.push('/workspaces')
            }
          } else {
            toast.error('Failed to import workspace')
          }
        }
      } catch (error) {
        console.error('Error importing:', error)
        toast.error('Import failed')
      }
      isDropdownVisible.value = false
    },
  },
  {
    label: 'API Keys',
    icon: CommandLineIcon,
    action: () => {
      router.push('/apikeys')
      isDropdownVisible.value = false
    },
  },
  {
    label: 'Quit', // New Quit item
    icon: PowerIcon,
    action: () => {
      electronAPI.closeApp()
      isDropdownVisible.value = false
    },
  },
]

// Add new export methods
const exportSubject = async () => {
  try {
    const workspaceId = localStorage.getItem('workspaceUUID')
    const selectedSubjectId = parseInt(
      localStorage.getItem('selectedSubjectId')
    )

    if (!workspaceId || !selectedSubjectId) {
      toast.error('Please select a subject to export')
      return
    }

    const data = await exportSubjectData(
      parseInt(workspaceId),
      selectedSubjectId
    )
    const result = await electronAPI.exportSubjectToFile(data)

    if (result.success) {
      toast.success('Subject exported successfully')
    } else {
      toast.error('Failed to export subject')
    }
  } catch (error) {
    console.error('Error exporting subject:', error)
    toast.error('Failed to export subject')
  }
}

const exportWorkspace = async () => {
  try {
    const workspaceId = localStorage.getItem('workspaceUUID')
    if (!workspaceId) {
      toast.error('No workspace selected')
      return
    }

    const data = await exportWorkspaceData(parseInt(workspaceId))
    const result = await electronAPI.exportWorkspaceToFile(data)

    if (result.success) {
      toast.success('Workspace exported successfully')
    } else {
      toast.error('Failed to export workspace')
    }
  } catch (error) {
    console.error('Error exporting workspace:', error)
    toast.error('Failed to export workspace')
  }
}

function toggleDropdown() {
  isDropdownVisible.value = !isDropdownVisible.value
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownVisible.value = false
  }
}

// Handle events from EditableWorkspaceName
function handleShowToast({ message, type }) {
  toast(message, {
    theme: 'auto',
    type: type,
    position: 'bottom-center',
    autoClose: 5000, // Default duration, can be overridden
  })
}

// Toast helper functions
function clearToast() {
  toastMessage.value = ''
  toastType.value = ''
}

function home() {
  router.push('/home')
}

const updateWorkspaceName = async (newName) => {
  try {
    const workspaceId = parseInt(localStorage.getItem('workspaceUUID'))
    await db.workspaces.update(workspaceId, {
      name: newName,
    })
    localWorkspaceName.value = newName
    localStorage.setItem('workspaceName', newName)
    // Removed toast message from here as it's now handled in EditableWorkspaceName
  } catch (error) {
    console.error('Error updating workspace name:', error)
  }
}

// Add handler for workspace switch events
const handleWorkspaceSwitch = ({ name }) => {
  localWorkspaceName.value = name
}

const currentSubject = ref(null)

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  eventBus.on('workspace-switched', handleWorkspaceSwitch)

  try {
    const workspaceId = parseInt(localStorage.getItem('workspaceUUID'))
    const userId = parseInt(localStorage.getItem('userUUID'))

    if (workspaceId) {
      // Get workspace details from DexieDB
      const workspace = await db.workspaces
        .where('id')
        .equals(workspaceId)
        .first()

      if (workspace) {
        localWorkspaceName.value = workspace.name
      }
    }

    if (userId) {
      // Get user details from DexieDB
      const user = await db.users.where('id').equals(userId).first()
      if (user) {
        localUserName.value = user.name
      }
    }
  } catch (error) {
    console.error('Error loading workspace/user details:', error)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  eventBus.off('workspace-switched', handleWorkspaceSwitch)
})
</script>

<style scoped>
/* Remove existing toast styles */
</style>
