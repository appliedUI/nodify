<template>
  <MainLayout>
    <div class="p-4">
      <Breadcrumbs
        :currentPage="'All Workspaces'"
        @breadcrumb-click="handleBreadcrumbClick"
      />

      <div class="workspace card bg-base-100 p-4">
        <table class="table w-full flex flex-col">
          <thead class="flex w-full">
            <tr class="uppercase flex w-full">
              <th class="pl-10 w-1/3">Name</th>
              <th class="w-1/3">Description</th>
              <th class="w-1/3 text-right pr-10">Actions</th>
            </tr>
          </thead>
          <tbody class="flex flex-col w-full">
            <tr
              v-for="workspace in paginatedWorkspaces"
              :key="workspace.id"
              class="flex w-full items-center py-2"
            >
              <td class="pl-10 w-1/3">
                <div v-if="editingId === workspace.id">
                  <input
                    v-model="editingWorkspace.name"
                    class="input input-bordered input-sm w-full max-w-xs bg-base-200 text-base-content"
                    placeholder="Workspace name"
                    @keyup.enter="saveEdit(workspace.id)"
                    @keyup.esc="cancelEdit"
                  />
                </div>
                <div v-else class="flex items-center">
                  <span
                    class="text-xl cursor-pointer hover:text-info transition-colors"
                    @click="switchWorkspace(workspace.id)"
                  >
                    {{ workspace.name }}
                  </span>
                  <span
                    v-if="isCurrentWorkspace(workspace.id)"
                    class="badge badge-primary ml-2 text-xs"
                  >
                    Active
                  </span>
                </div>
              </td>
              <td class="w-1/3">
                <div v-if="editingId === workspace.id">
                  <input
                    v-model="editingWorkspace.description"
                    class="input input-bordered input-sm w-full max-w-xs bg-base-200 text-base-content"
                    placeholder="Description"
                    @keyup.enter="saveEdit(workspace.id)"
                    @keyup.esc="cancelEdit"
                  />
                </div>
                <div v-else class="text-white/60">
                  {{ workspace.description }}
                </div>
              </td>
              <td class="w-1/3 flex justify-end pr-10">
                <div v-if="editingId === workspace.id">
                  <button
                    class="btn btn-primary btn-xs mr-2"
                    @click="saveEdit(workspace.id)"
                  >
                    Save
                  </button>
                  <button class="btn btn-ghost btn-xs" @click="cancelEdit">
                    Cancel
                  </button>
                </div>
                <div v-else>
                  <button
                    class="btn btn-primary btn-xs mr-3"
                    @click="startEdit(workspace)"
                  >
                    Edit
                  </button>
                  <button
                    class="btn btn-secondary btn-xs"
                    @click="deleteWorkspace(workspace.id)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="flex justify-center w-full mt-4 pagination-container">
          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              «
            </button>
            <button class="join-item btn btn-sm">
              Page {{ currentPage }} of {{ totalPages }}
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import Breadcrumbs from '@/atoms/Breadcrumbs.vue'
import { toast } from 'vue3-toastify'
import { db } from '@/db/db' // Use the unified db
import { WorkspaceModel } from '@/models/WorkspaceModel'
import eventBus from '@/utils/eventBus'
import { useRouter } from 'vue-router'

const redirectedFromWorkspace = ref(false)
const workspaces = ref([])
const editingId = ref(null)
const editingWorkspace = ref({})
const currentPage = ref(1)
const itemsPerPage = 5
const currentWorkspaceUUID = ref(localStorage.getItem('workspaceUUID'))
const router = useRouter()

const fetchWorkspaces = async () => {
  try {
    const userUUID = localStorage.getItem('userUUID')
    if (!userUUID) {
      console.warn('No userUUID found in localStorage')
      return
    }

    console.log('Fetching workspaces for user:', userUUID)
    const results = await db.getAllWorkspacesForUser(userUUID)

    workspaces.value = results
      .map(
        (workspace) =>
          new WorkspaceModel({
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            status: workspace.status,
            createdAt: workspace.createdAt,
          })
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by createdAt descending

    // Reset to first page when data changes
    currentPage.value = 1

    console.log('Updated workspaces:', workspaces.value)
  } catch (error) {
    console.error('Failed to fetch workspaces:', error)
    toast.error('Failed to load workspaces', {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 2000,
    })
    workspaces.value = []
  }
}

const handleBreadcrumbClick = (breadcrumb) => {
  if (breadcrumb === 'workspace' && redirectedFromWorkspace.value) {
    toast.warning(
      'Please add an OpenAI key before returning to the workspace.',
      {
        position: toast.POSITION.BOTTOM_CENTER,
        autoClose: 2000,
      }
    )
  }
}

const startEdit = (workspace) => {
  editingId.value = workspace.id
  editingWorkspace.value = {
    name: workspace.name,
    description: workspace.description,
  }
}

const cancelEdit = () => {
  editingId.value = null
  editingWorkspace.value = {}
}

const saveEdit = async (id) => {
  try {
    await db.workspaces.update(id, {
      name: editingWorkspace.value.name,
      description: editingWorkspace.value.description,
    })

    // Update the local state
    const index = workspaces.value.findIndex((w) => w.id === id)
    if (index !== -1) {
      workspaces.value[index].name = editingWorkspace.value.name
      workspaces.value[index].description = editingWorkspace.value.description
    }

    toast.success('Workspace updated successfully', {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 800,
      theme: 'dark',
      type: 'success',
      transition: 'slide',
    })
    cancelEdit()
  } catch (error) {
    console.error('Failed to update workspace:', error)
    toast.error('Failed to update workspace', {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 800,
      theme: 'dark',
      type: 'success',
      transition: 'slide',
    })
  }
}

const deleteWorkspace = async (id) => {
  if (!confirm('Are you sure you want to delete this workspace?')) {
    return
  }

  try {
    // If deleting current workspace, find the next one to switch to
    if (String(id) === currentWorkspaceUUID.value) {
      const currentIndex = workspaces.value.findIndex(
        (w) => String(w.id) === String(id)
      )
      const nextWorkspace =
        workspaces.value[currentIndex + 1] || workspaces.value[currentIndex - 1]

      if (nextWorkspace) {
        await switchWorkspace(nextWorkspace.id)
      } else {
        // Clear workspace if no other workspace exists
        localStorage.removeItem('workspaceUUID')
        localStorage.removeItem('workspaceName')
        currentWorkspaceUUID.value = null
        toast.info('No workspaces remaining. Please create a new workspace.', {
          position: toast.POSITION.BOTTOM_CENTER,
          autoClose: 3000,
          theme: 'dark',
          type: 'info',
          transition: 'slide',
        })
      }
    }

    // Delete the workspace and its associations
    await db.workspaceUsers.where('workspaceId').equals(id).delete()
    await db.workspaces.delete(id)

    // Update the local state
    workspaces.value = workspaces.value.filter((w) => w.id !== id)
    toast.success('Workspace deleted successfully', {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 800,
      theme: 'dark',
      type: 'success',
      transition: 'slide',
    })
  } catch (error) {
    console.error('Failed to delete workspace:', error)
    toast.error('Failed to delete workspace', {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 800,
      theme: 'dark',
      type: 'error',
      transition: 'slide',
    })
  }
}

// Computed property for total pages
const totalPages = computed(() => {
  return Math.ceil(workspaces.value.length / itemsPerPage)
})

// Computed property for paginated workspaces
const paginatedWorkspaces = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return workspaces.value.slice(start, end)
})

// Add watch for total pages to prevent invalid current page
watch(totalPages, (newTotalPages) => {
  if (currentPage.value > newTotalPages) {
    currentPage.value = Math.max(1, newTotalPages)
  }
})

const isCurrentWorkspace = (workspaceId) => {
  return String(workspaceId) === currentWorkspaceUUID.value
}

// Add new function to handle workspace switching
const switchWorkspace = async (workspaceId) => {
  try {
    const workspace = await db.workspaces.get(workspaceId)
    if (!workspace) throw new Error('Workspace not found')

    // Update localStorage
    localStorage.setItem('workspaceUUID', String(workspaceId))
    localStorage.setItem('workspaceName', workspace.name)
    currentWorkspaceUUID.value = String(workspaceId)

    // Emit workspace switch event
    eventBus.emit('workspace-switched', {
      id: workspaceId,
      name: workspace.name,
    })

    // Add navigation to workspace view
    router.push({ name: 'Workspace' })
  } catch (error) {
    console.error('Failed to switch workspace:', error)
    toast.error('Failed to switch workspace', {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 800,
      theme: 'dark',
      type: 'error',
      transition: 'slide',
    })
  }
}

// Add watch for currentWorkspaceUUID
watch(currentWorkspaceUUID, async (newWorkspaceId) => {
  if (newWorkspaceId) {
    console.log('Workspace changed to:', newWorkspaceId)
    // You could trigger any additional actions needed when workspace changes
  }
})

// Add event listener for workspace updates
const handleWorkspaceUpdate = async ({ id, name }) => {
  const index = workspaces.value.findIndex((w) => w.id === id)
  if (index !== -1) {
    workspaces.value[index].name = name
  }
}

onMounted(async () => {
  await db.open() // Ensure database is open
  await fetchWorkspaces()
  console.log('Current workspace UUID:', currentWorkspaceUUID.value)

  // Add listener for workspace updates
  window.addEventListener('workspace-updated', fetchWorkspaces)
})

onUnmounted(() => {
  // Remove listener when component is destroyed
  window.removeEventListener('workspace-updated', fetchWorkspaces)
})
</script>

<style scoped>
.join {
  display: flex;
  gap: 0.5rem;
}

.join-item {
  margin: 0;
}

.pagination-container {
  position: fixed;
  bottom: 30px;
  width: 100%;
}
</style>
