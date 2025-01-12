<template>
  <div class="org-chart-container">
    <div v-if="orgChartData" class="org-chart-wrapper">
      <!-- Org Chart Visualization -->
      <svg ref="orgChartSvg" style="width: 100%; height: 100%"></svg>
    </div>
    <div v-else class="empty-org-chart">No Org Chart Available</div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import { useSubjectsStore } from '@/stores/subjectsStore'

const subjectsStore = useSubjectsStore()
const orgChartSvg = ref(null)
const orgChartData = ref(null)
let simulation = null

/* Function to initialize or remove the Org Chart */
function initializeOrgChart(data) {
  if (data) {
    orgChartData.value = data
    renderOrgChart(data)
  } else {
    orgChartData.value = null
    clearOrgChart()
  }
}

/* Render the Org Chart */
function renderOrgChart(data) {
  const svg = d3.select(orgChartSvg.value)
  svg.selectAll('*').remove() // Clear existing chart

  // Example Org Chart Rendering Logic
  const width = orgChartSvg.value.clientWidth
  const height = orgChartSvg.value.clientHeight

  const root = d3.hierarchy(data)
  const treeLayout = d3.tree().size([width, height])
  treeLayout(root)

  // Draw links
  svg
    .selectAll('path.link')
    .data(root.links())
    .join('path')
    .attr('class', 'link')
    .attr(
      'd',
      d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)
    )
    .attr('fill', 'none')
    .attr('stroke', '#555')

  // Draw nodes
  const node = svg
    .selectAll('g.node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'node')
    .attr('transform', (d) => `translate(${d.y},${d.x})`)

  node.append('circle').attr('r', 20).attr('fill', '#999')

  node
    .append('text')
    .attr('dy', 5)
    .attr('x', (d) => (d.children ? -25 : 25))
    .style('text-anchor', (d) => (d.children ? 'end' : 'start'))
    .text((d) => d.data.name)
}

/* Clear the Org Chart */
function clearOrgChart() {
  const svg = d3.select(orgChartSvg.value)
  svg.selectAll('*').remove()
}

/* Watch for graph changes to update the Org Chart in real-time */
watch(
  () => subjectsStore.currentSubject?.graph,
  (newGraph) => {
    if (newGraph) {
      initializeOrgChart(newGraph)
    } else {
      initializeOrgChart(null)
    }
  }
)

onMounted(() => {
  // Initialize Org Chart based on current graph state
  const currentGraph = subjectsStore.currentSubject?.graph
  if (currentGraph) {
    initializeOrgChart(currentGraph)
  }

  // Listen for storage events if needed
  window.addEventListener('storage', handleStorageChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorageChange)
})

function handleStorageChange(event) {
  if (event.key === 'graph') {
    if (!event.newValue) {
      initializeOrgChart(null)
    }
  }
}
</script>

<style scoped>
.org-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.org-chart-wrapper {
  width: 100%;
  height: 100%;
}

.empty-org-chart {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #888;
  font-size: 1.2rem;
}
</style>
