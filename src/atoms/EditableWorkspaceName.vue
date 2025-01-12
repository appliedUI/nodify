<template>
  <div class="editable-workspace">
    <div v-if="!isEditing" @click="startEdit" class="cursor-pointer mr-3">
      {{ workspaceName }}
    </div>
    <input
      v-else
      v-model="editedName"
      ref="nameInput"
      @blur="handleBlur"
      @keydown.enter.prevent="handleEnter"
      @keyup.esc="cancelEdit"
      class="workspace-name-input bg-transparent border-b border-gray-300 focus:border-gray-500 mr-3"
      type="text"
    />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { db } from '@/db/db';
import { toast } from 'vue3-toastify';
import eventBus from '@/utils/eventBus';

const props = defineProps({
  workspaceName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:workspace-name']);

const isEditing = ref(false);
const editedName = ref(props.workspaceName);
const nameInput = ref(null);
let isSubmitting = false; // Add this flag to prevent double submission

watch(
  () => props.workspaceName,
  (newValue) => {
    editedName.value = newValue;
  }
);

const startEdit = () => {
  editedName.value = props.workspaceName;
  isEditing.value = true;
  nextTick(() => {
    nameInput.value.focus();
  });
};

const saveName = async () => {
  if (!editedName.value || editedName.value === props.workspaceName) {
    isEditing.value = false;
    return;
  }

  try {
    const workspaceId = parseInt(localStorage.getItem('workspaceUUID'));

    // Check if name is taken
    const existing = await db.workspaces
      .where('name')
      .equals(editedName.value)
      .first();

    if (existing && existing.id !== workspaceId) {
      toast('This workspace name is already taken', {
        theme: 'auto',
        type: 'error',
        position: 'bottom-center',
        autoClose: 2000,
        transition: 'slide',
      });
      return;
    }

    // Update in DexieDB
    await db.workspaces.update(workspaceId, {
      name: editedName.value,
    });

    emit('update:workspace-name', editedName.value);
    localStorage.setItem('workspaceName', editedName.value);

    // Emit event for other components
    eventBus.emit('workspace-updated', { id: workspaceId, name: editedName.value });

    // Only show toast here, removed from AppBar
    toast('Workspace name updated successfully', {
      theme: 'auto',
      type: 'success',
      position: 'bottom-center',
      autoClose: 2000,
      transition: 'slide',
    });
    isEditing.value = false;
  } catch (error) {
    console.error('Error updating workspace name:', error);
    toast('Failed to update workspace name', {
      theme: 'auto',
      type: 'error',
      position: 'bottom-center',
      autoClose: 2000,
      transition: 'slide',
    });
    editedName.value = props.workspaceName;
  }
};

const handleEnter = async (e) => {
  if (isSubmitting) return;
  isSubmitting = true;
  await saveName();
  e.target.blur();
  isSubmitting = false;
};

const handleBlur = () => {
  if (!isSubmitting && isEditing.value) {
    saveName();
  } else {
    isEditing.value = false;
  }
};

const cancelEdit = () => {
  isEditing.value = false;
  editedName.value = props.workspaceName;
};

// Add listener for workspace switches
watch(() => localStorage.getItem('workspaceUUID'), async (newWorkspaceId) => {
  if (newWorkspaceId) {
    const workspace = await db.workspaces.get(parseInt(newWorkspaceId));
    if (workspace) {
      editedName.value = workspace.name;
      emit('update:workspace-name', workspace.name);
    }
  }
});

// Add handler for workspace switch events
const handleWorkspaceSwitch = ({ name }) => {
  editedName.value = name;
  emit('update:workspace-name', name);
};

onMounted(() => {
  eventBus.on('workspace-switched', handleWorkspaceSwitch);
});

onUnmounted(() => {
  eventBus.off('workspace-switched', handleWorkspaceSwitch);
});
</script>

<style scoped>
/* Add any specific styles if needed */
</style>
