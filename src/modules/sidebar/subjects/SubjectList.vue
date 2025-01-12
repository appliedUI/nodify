<template>
  <div class="w-full px-5 py-5 relative">
    <div class="flex gap-2 mb-4 justify-center">
      <div class="tooltip tooltip-bottom" data-tip="Open Notes">
        <button
          class="btn btn-secondary btn-sm relative"
          :class="{ 'opacity-80': !subjectsStore.selectedSubjectId }"
          :disabled="!subjectsStore.selectedSubjectId"
          @click="openDrawerNotes"
        >
          <!-- TODO: will add -->
          <!-- <div
            v-if="subjectsStore.sortedSubjects.length > 0"
            class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
          ></div> -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      </div>

      <div class="tooltip tooltip-bottom" data-tip="Add New Subject">
        <button class="btn btn-secondary btn-sm" @click="openModal">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <div class="tooltip tooltip-bottom" data-tip="Switch Workspace">
        <div class="dropdown dropdown-bottom">
          <label tabindex="0" class="btn btn-secondary btn-sm w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </label>
          <ul
            tabindex="0"
            class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-50"
          >
            <li>
              <a @click="createNewWorkspace">
                <span class="text-info">
                  <PlusIcon class="h-4 w-4" />
                </span>
              </a>
            </li>
            <li v-for="workspace in workspaces" :key="workspace.id">
              <a @click="switchWorkspace(workspace.id)">
                {{ workspace.name }}
                <span
                  v-if="String(workspace.id) === String(currentWorkspaceUUID)"
                  class="badge badge-primary badge-xs ml-2"
                >
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="transcript">
      <Transcript />
    </div>

    <!-- Subjects Card List -->
    <div
      class="subjects-list space-y-3 max-h-[calc(100vh-330px)] overflow-y-auto pb-[205px]"
    >
      <div v-if="subjectsStore.sortedSubjects.length === 0">
        <div class="flex justify-center rotate-180">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="30"
            viewBox="0 0 24 40"
            class="animate-bounce-slow"
            style="transform: rotate(0deg)"
          >
            <path
              fill="currentColor"
              d="M12 40a1.5 1.5 0 0 1-1.06-.44l-10-10a1.5 1.5 0 0 1 2.12-2.12L12 36.38l8.94-8.94a1.5 1.5 0 0 1 2.12 2.12l-10 10A1.5 1.5 0 0 1 12 40zM12 20a1.5 1.5 0 0 1-1.06-.44l-10-10a1.5 1.5 0 0 1 2.12-2.12L12 16.38l8.94-8.94a1.5 1.5 0 0 1 2.12 2.12l-10 10A1.5 1.5 0 0 1 12 20z"
            />
          </svg>
        </div>
        <div class="text-center text-gray-300 mt-3">Create a subject</div>
      </div>

      <div
        v-for="subject in subjectsStore.sortedSubjects"
        :key="subject.id"
        class="card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer"
        :class="{
          'selected-subject':
            !isInitialLoad && subjectsStore.selectedSubjectId === subject.id,
        }"
        @click="selectSubject(subject)"
        @dblclick="openRenameModal(subject)"
      >
        <div class="card-body p-4">
          <div class="flex justify-between items-center">
            <h3 class="card-title text-sm">{{ subject.name }}</h3>
            <button
              class="btn btn-ghost btn-xs"
              @click.stop="deleteSubject(subject.id)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="text-xs text-gray-500">
            Created {{ new Date(subject.createdAt).toLocaleDateString() }}
          </div>
        </div>
      </div>
    </div>

    <!-- Add the LeftDrawer component -->
    <LeftDrawer ref="leftDrawer"> </LeftDrawer>
  </div>

  <!-- Modal -->
  <div v-if="isModalOpen" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Add New Subject</h3>
      <form @submit.prevent="saveSubject">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Subject Name</span>
          </label>
          <input
            type="text"
            v-model="subjectName"
            class="input input-bordered"
            required
            ref="subjectInput"
          />
        </div>
        <div class="modal-action">
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" class="btn" @click="closeModal">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Add rename modal -->
  <div v-if="isRenameModalOpen" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Rename Subject</h3>
      <form @submit.prevent="renameSubject">
        <div class="form-control">
          <label class="label">
            <span class="label-text">New Name</span>
          </label>
          <input
            type="text"
            v-model="newSubjectName"
            class="input input-bordered"
            required
          />
        </div>
        <div class="modal-action">
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" class="btn" @click="closeRenameModal">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { toast } from 'vue3-toastify'
import { useSubjectsStore } from '@/stores/subjectsStore'
import Transcript from '../../sidebar/record/Transcript.vue'
import { db } from '@/db/db'
import eventBus from '@/utils/eventBus'
import { useRouter } from 'vue-router'
import LeftDrawer from './SubjectDrawer.vue'

import { PlusIcon, FolderIcon } from '@heroicons/vue/24/outline'

const isModalOpen = ref(false)
const subjectName = ref('')
const subjectsStore = useSubjectsStore()
const isInitialLoad = ref(true)
const workspaces = ref([])
const currentWorkspaceUUID = ref(localStorage.getItem('workspaceUUID'))
const router = useRouter()
const leftDrawer = ref(null)
const subjectInput = ref(null)

const openDrawerNotes = () => {
  leftDrawer.value.open()
}

const deleteSubject = async (id) => {
  if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
    return
  }

  try {
    await subjectsStore.deleteSubject(id)
    toast('Subject deleted!', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      autoClose: 800,
      transition: 'slide',
    })
  } catch (error) {
    toast.error('Error deleting subject: ' + error.message, {
      position: toast.POSITION.TOP_CENTER,
    })
  }
}

const saveSubject = async () => {
  try {
    await subjectsStore.createSubject(subjectName.value)
    closeModal()
    toast('Subject saved!', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      autoClose: 800,
      transition: 'slide',
    })
  } catch (error) {
    toast.error('Error creating subject: ' + error.message, {
      position: toast.POSITION.TOP_CENTER,
      autoClose: 800,
    })
  }
}

const selectSubject = (subject) => {
  isInitialLoad.value = false
  subjectsStore.setSelectedSubject(subject)
}

onMounted(() => {
  // Clear selected subject on mount/refresh
  subjectsStore.clearSelection()
  isInitialLoad.value = true
  // Fetch subjects list
  subjectsStore.fetchSubjects()
  fetchWorkspaces()
})

const openModal = () => {
  isModalOpen.value = true
  nextTick(() => {
    if (subjectInput.value) {
      subjectInput.value.focus()
    }
  })
}

const closeModal = () => {
  isModalOpen.value = false
  subjectName.value = ''
}

const fetchWorkspaces = async () => {
  try {
    const userUUID = localStorage.getItem('userUUID')
    if (!userUUID) return
    const results = await db.getAllWorkspacesForUser(userUUID)
    workspaces.value = results
  } catch (error) {
    console.error('Failed to fetch workspaces:', error)
  }
}

const switchWorkspace = async (workspaceId) => {
  try {
    // Get the workspace details
    const workspace = workspaces.value.find((w) => w.id === workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Update localStorage
    localStorage.setItem('workspaceUUID', workspaceId)
    localStorage.setItem('workspaceName', workspace.name)
    currentWorkspaceUUID.value = workspaceId

    // Emit workspace switch event
    eventBus.emit('workspace-switched', {
      id: workspaceId,
      name: workspace.name,
    })

    // Show success message
    toast.success(`Switched to workspace: ${workspace.name}`, {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 1000,
    })

    // Refresh the page to ensure all components update
    window.location.reload()
  } catch (error) {
    console.error('Failed to switch workspace:', error)
    toast.error('Failed to switch workspace', {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 2000,
    })
  }
}

const createNewWorkspace = () => {
  router.push({ name: 'cworkspace' })
}

const isRenameModalOpen = ref(false)
const newSubjectName = ref('')
const selectedSubjectForRename = ref(null)

const openRenameModal = (subject) => {
  selectedSubjectForRename.value = subject
  newSubjectName.value = subject.name
  isRenameModalOpen.value = true
}

const closeRenameModal = () => {
  isRenameModalOpen.value = false
  newSubjectName.value = ''
  selectedSubjectForRename.value = null
}

const renameSubject = async () => {
  if (!selectedSubjectForRename.value || !newSubjectName.value) return

  try {
    await subjectsStore.renameSubject(
      selectedSubjectForRename.value.id,
      newSubjectName.value
    )
    closeRenameModal()
    toast('Subject renamed!', {
      theme: 'auto',
      type: 'success',
      position: 'top-center',
      autoClose: 800,
      transition: 'slide',
    })
  } catch (error) {
    toast.error('Error renaming subject: ' + error.message, {
      position: toast.POSITION.TOP_CENTER,
    })
  }
}
</script>

<style scoped>
.subjects-list {
  max-height: calc(
    100vh - 330px
  ); /* Adjusted to be flush above the transcript panel */
  overflow-y: auto;
}

.selected-subject {
  /* @apply bg-secondary ; */
  border: 1px solid rgb(31, 111, 102) !important;
  box-shadow: 0 0 5px #000000 !important;
  background-color: #081d1a !important;
}

.card {
  @apply border-accent border-opacity-30;
  @apply border border-transparent;
  @apply shadow-lg;
}
.card:hover {
  border: 1px solid #0d2f2b !important;
}

@keyframes bounce-slow {
  0%,
  100% {
    transform: translateY(0);
    animation-timing-function: ease-out;
  }
  50% {
    transform: translateY(-10px);
    animation-timing-function: ease-in;
  }
}

.animate-bounce-slow {
  animation: bounce-slow 3s infinite;
}
</style>
