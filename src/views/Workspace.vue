<template>
  <MainLayout>
    <div class="flex">
      <Sidebar class="w-[230px]" />
      <div class="flex-1 flex-col">
        <div class="graph-wrapper ml-[230px]">
          <component
            :is="selectedGraph"
            :graphType="graphType"
            @update:graphType="updateGraphType"
          />
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ForceGraph from '../modules/workspace/ForceGraph.vue'
import OrgChart from '../modules/workspace/OrgChart.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import Sidebar from '@/modules/sidebar/Sidebar.vue'
import NoSubject from '@/assets/img/noSubject.svg'
import NoSubject2 from '@/assets/img/noSubject2.svg'
import { useSubjectsStore } from '@/stores/subjectsStore'
import { db } from '@/db/db'

const subjectsStore = useSubjectsStore()
const graphType = ref('forceGraph')

const selectedGraph = computed(() => {
  return graphType.value === 'forceGraph' ? ForceGraph : OrgChart
})

const updateGraphType = (newType) => {
  graphType.value = newType
}

// Load workspace data
onMounted(async () => {
  const workspaceId = localStorage.getItem('workspaceUUID')
  if (workspaceId) {
    try {
      const workspace = await db.workspaces.get(Number(workspaceId))
      if (workspace) {
        // Load subjects for this workspace
        await subjectsStore.fetchSubjects()
      }
    } catch (error) {
      console.error('Error loading workspace:', error)
    }
  }
})
</script>

<style scoped>
.graph-wrapper {
  position: absolute;
  inset: 0; /* Shorthand for top:0, right:0, bottom:0, left:0 */
}
</style>
