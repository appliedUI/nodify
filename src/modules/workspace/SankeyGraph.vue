<template>
  <div class="force-graph-container">
    <GraphProcessing />
    <div v-if="hasGraphData" class="graph-wrapper">
      <div class="controls-panel">
        <div class="collapse collapse-arrow bg-base-200/70 backdrop-blur">
          <input type="checkbox" />
          <div class="collapse-title font-medium">Graph Controls</div>
          <div class="collapse-content">
            <div class="flex flex-col gap-4">
              <div>
                <p class="text-sm text-gray-300">
                  Sankey mode highlights directional flow between concepts.
                  Switch back to Force layout to fine-tune physics.
                </p>
              </div>
              <div>
                <label class="label">
                  <span class="label-text"
                    >Curve Smoothness: {{ curveness }}</span
                  >
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  v-model.number="curveness"
                  class="range range-primary range-sm"
                />
              </div>
              <div>
                <label class="label">
                  <span class="label-text">Node Gap: {{ nodeGap }}px</span>
                </label>
                <input
                  type="range"
                  min="8"
                  max="48"
                  step="2"
                  v-model.number="nodeGap"
                  class="range range-primary range-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="fixed-controls">
        <button
          class="btn btn-circle btn-sm bg-base-200/70 backdrop-blur tooltip tooltip-top mb-4 p-1"
          @click="updateGraphType('forceGraph')"
          :class="{ 'btn-active': graphType === 'forceGraph' }"
          data-tip="Force Graph Layout"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
        </button>
        <button
          class="btn btn-circle btn-sm bg-base-200/70 backdrop-blur tooltip tooltip-top mb-4 p-1"
          @click="updateGraphType('sankey')"
          :class="{ 'btn-active': graphType === 'sankey' }"
          data-tip="Sankey Layout"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 7c4.5 0 4.5 10 9 10s4.5-10 9-10"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 17c4.5 0 4.5-10 9-10s4.5 10 9 10"
            />
          </svg>
        </button>
        <button
          class="btn btn-circle btn-sm bg-base-200/70 backdrop-blur tooltip tooltip-top mb-4 p-1"
          @click="resetView"
          data-tip="Reset View"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>
      </div>

      <div class="mindmap-container">
        <div ref="chartRef" class="sankey-chart"></div>
      </div>
    </div>
    <div v-else class="empty-graph">
      <div
        class="flex flex-col items-center justify-center h-full w-3/4"
        v-if="!subjectsStore.OpenAIKeyState && !apikeyState"
      >
        <h2 class="text-2xl font-semibold text-gray-300 mb-2">
          Add your OpenAI Key
        </h2>
        <p class="text-gray-500">
          Use your OpenAI API developer key to generate knowledge for your graph
        </p>
        <small class="text-gray-500 mt-4">
          <a
            href="https://openai.com/api/"
            target="_blank"
            class="text-accent hover:underline"
          >
            Get one from OpenAI</a
          >
        </small>
        <div class="w-full mt-10">
          <OpenAIKeyInput />
        </div>
      </div>
      <div
        class="flex flex-col items-center justify-center h-full w-3/4"
        v-else
      >
        <h2 class="text-2xl font-semibold text-gray-300 mb-4">
          Please create or select a subject
        </h2>
        <p class="text-gray-500">
          Get started by selecting a subject from the sidebar
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useSubjectsStore } from '@/stores/subjectsStore'
import { useVideoStore } from '@/stores/videoStore'
import { db } from '@/db/db'
import GraphProcessing from './composables/graphProcessing.vue'
import OpenAIKeyInput from '@/atoms/OpenAIKeyInput.vue'

const subjectsStore = useSubjectsStore()
const videoStore = useVideoStore()
const apikeyState = ref(localStorage.getItem('openai_key'))

const props = defineProps({
  graphType: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:graphType'])

const chartRef = ref(null)
const chartInstance = ref(null)
const graphData = ref(null)
const curveness = ref(0.5)
const nodeGap = ref(24)

const hasGraphData = computed(() => !!graphData.value?.nodes?.length)

const updateGraphType = (type) => emit('update:graphType', type)

const nodeColorScale = ['#FFB703', '#FB8500', '#8ECAE6', '#219EBC', '#A0AEC0']

const initChart = () => {
  console.log('[Sankey] 🎨 initChart called')
  console.log('[Sankey] chartInstance exists?', !!chartInstance.value)
  console.log('[Sankey] chartRef exists?', !!chartRef.value)

  if (!chartInstance.value && chartRef.value) {
    console.log('[Sankey] Creating new ECharts instance...')
    chartInstance.value = echarts.init(chartRef.value, undefined, {
      renderer: 'canvas',
    })
    console.log('[Sankey] ✅ ECharts instance created:', chartInstance.value)
  } else if (chartInstance.value) {
    console.log('[Sankey] Chart instance already exists')
  } else {
    console.warn('[Sankey] ⚠️  chartRef.value is null, cannot init chart')
  }
}

const disposeChart = () => {
  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
}

const normalizeGraphPayload = (payload) => {
  if (!payload) return null
  if (payload.nodes?.length) return payload
  if (payload.graph?.nodes?.length) return payload.graph
  return null
}

const syncGraphData = async () => {
  console.log('[Sankey] 🔄 Syncing graph data...')
  console.log('[Sankey] Store graph:', subjectsStore.graph)
  console.log('[Sankey] Selected subject ID:', subjectsStore.selectedSubjectId)

  let graph = normalizeGraphPayload(subjectsStore.graph)
  console.log('[Sankey] Normalized from store:', graph)

  if (!graph?.nodes?.length) {
    console.log('[Sankey] No graph in store, checking localStorage...')
    const cached = localStorage.getItem('graph')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        console.log('[Sankey] Parsed from localStorage:', parsed)
        graph = normalizeGraphPayload(parsed)
      } catch (error) {
        console.error('[Sankey] Failed to parse cached graph:', error)
      }
    }
  }

  if (!graph?.nodes?.length && subjectsStore.selectedSubjectId) {
    console.log('[Sankey] Still no graph, fetching from DB...')
    try {
      const subject = await db.subjects.get(subjectsStore.selectedSubjectId)
      console.log('[Sankey] Subject from DB:', subject)
      graph = normalizeGraphPayload(subject?.graph)
      console.log('[Sankey] Normalized from DB:', graph)
    } catch (error) {
      console.error('[Sankey] Failed to fetch graph from DB:', error)
    }
  }

  graphData.value = graph
  console.log('[Sankey] ✅ Final graphData.value:', graphData.value)
  console.log('[Sankey] Has nodes?', !!graphData.value?.nodes?.length)
  console.log('[Sankey] chartRef.value exists?', !!chartRef.value)

  await nextTick()
  renderSankey()
}

const formatGraphForSankey = () => {
  console.log('[Sankey] 📊 Formatting graph for Sankey...')
  console.log('[Sankey] Raw graphData:', graphData.value)

  if (!graphData.value?.nodes?.length) {
    console.warn('[Sankey] ⚠️  No nodes in graphData, returning empty')
    return { nodes: [], links: [] }
  }

  console.log('[Sankey] Node count:', graphData.value.nodes.length)
  console.log('[Sankey] Link count:', graphData.value.links?.length || 0)

  const nodeMap = new Map()
  graphData.value.nodes.forEach((node, index) => {
    nodeMap.set(node.id, node)
  })

  const sankeyNodes = graphData.value.nodes.map((node, index) => ({
    name: node.id,
    label: { formatter: node.label || node.id },
    itemStyle: {
      color: nodeColorScale[index % nodeColorScale.length],
    },
    value: Math.max(1, node.importance || 1),
    info: node,
  }))

  // Handle links - source/target might be objects (from D3) or strings
  const sankeyLinks = (graphData.value.links || [])
    .map((link) => {
      // Extract IDs whether source/target are objects or strings
      const sourceId =
        typeof link.source === 'object' ? link.source.id : link.source
      const targetId =
        typeof link.target === 'object' ? link.target.id : link.target

      console.log('[Sankey] Processing link:', { sourceId, targetId, link })

      const sourceNode = nodeMap.get(sourceId)
      const targetNode = nodeMap.get(targetId)

      if (!sourceNode || !targetNode) {
        console.warn('[Sankey] ⚠️  Missing node for link:', {
          sourceId,
          targetId,
        })
        return null
      }

      const averageImportance = Math.max(
        1,
        Math.round(
          ((sourceNode?.importance || 1) + (targetNode?.importance || 1)) / 2
        )
      )

      return {
        source: sourceId,
        target: targetId,
        value: averageImportance,
        tooltipData: link,
        lineStyle: {
          opacity: 0.6,
        },
      }
    })
    .filter(Boolean) // Remove null entries

  console.log('[Sankey] ✅ Formatted nodes:', sankeyNodes.length)
  console.log('[Sankey] ✅ Formatted links:', sankeyLinks.length)
  console.log('[Sankey] Sample node:', sankeyNodes[0])
  console.log('[Sankey] Sample link:', sankeyLinks[0])

  return { nodes: sankeyNodes, links: sankeyLinks }
}

const renderSankey = () => {
  console.log('[Sankey] 🎬 renderSankey called')
  console.log('[Sankey] chartRef.value:', chartRef.value)

  if (!chartRef.value) {
    console.warn('[Sankey] ⚠️  chartRef is null, cannot render')
    return
  }

  initChart()
  const { nodes, links } = formatGraphForSankey()

  console.log(
    '[Sankey] After format - nodes:',
    nodes.length,
    'links:',
    links.length
  )

  if (!nodes.length) {
    console.warn('[Sankey] ⚠️  No nodes to render, clearing chart')
    chartInstance.value?.clear()
    return
  }

  const labelLookup = Object.fromEntries(
    nodes.map((node) => [node.name, node.info?.label || node.name])
  )

  const option = {
    backgroundColor: '#050505',
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: '3%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#E2E8F0' },
      formatter: (params) => {
        if (params.dataType === 'edge') {
          const { source, target, value, tooltipData } = params.data
          const relation = tooltipData?.relationship
            ? `<div class="text-xs text-slate-400 mt-1">${tooltipData.relationship}</div>`
            : ''
          return `
            <div class="text-sm font-semibold text-white">${labelLookup[source]} → ${labelLookup[target]}</div>
            <div class="text-xs text-slate-300">Weight: ${value}</div>
            ${relation}
          `
        }
        const info = params.data.info || {}
        return `
          <div class="text-sm font-semibold text-white">${
            info.label || info.id
          }</div>
          <div class="text-xs text-slate-300">Level ${info.level}</div>
          <div class="text-xs text-slate-400">Importance: ${
            info.importance || 1
          }</div>
        `
      },
    },
    series: [
      {
        type: 'sankey',
        data: nodes,
        links,
        left: '5%',
        top: '5%',
        right: '20%',
        bottom: '5%',
        emphasis: {
          focus: 'adjacency',
        },
        nodeWidth: 20,
        nodeGap: nodeGap.value,
        layoutIterations: 32,
        draggable: false,
        orient: 'horizontal',
        lineStyle: {
          color: 'gradient',
          curveness: curveness.value,
          opacity: 0.7,
        },
        label: {
          show: true,
          position: 'right',
          color: '#E2E8F0',
          fontSize: 13,
          fontWeight: 500,
          formatter: ({ data }) => data.info?.label || data.name,
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          opacity: 0.95,
        },
      },
    ],
  }

  console.log('[Sankey] 🎨 Setting ECharts option...')
  console.log('[Sankey] Chart instance exists?', !!chartInstance.value)
  console.log('[Sankey] Option:', option)

  try {
    chartInstance.value?.setOption(option, true)

    // Force resize to ensure proper rendering
    setTimeout(() => {
      chartInstance.value?.resize({
        width: chartRef.value?.offsetWidth || 'auto',
        height: chartRef.value?.offsetHeight || 'auto',
      })
    }, 100)

    console.log('[Sankey] ✅ Sankey chart rendered successfully')
    console.log(
      '[Sankey] Chart dimensions:',
      chartRef.value?.offsetWidth,
      'x',
      chartRef.value?.offsetHeight
    )
  } catch (error) {
    console.error('[Sankey] ❌ Error setting option:', error)
  }
}

const resetView = () => {
  renderSankey()
}

watch(
  () => subjectsStore.graph,
  (newVal, oldVal) => {
    console.log('[Sankey] 👀 Store graph changed')
    console.log('[Sankey] New value:', newVal)
    console.log('[Sankey] Old value:', oldVal)
    syncGraphData()
  },
  { immediate: true, deep: true }
)

watch(
  () => subjectsStore.selectedSubjectId,
  (newId, oldId) => {
    console.log('[Sankey] 👀 Selected subject changed:', oldId, '->', newId)
    syncGraphData()
  }
)

watch([curveness, nodeGap], () => {
  renderSankey()
})

watch(
  () => videoStore.isVideoProcessing,
  async (isProcessing) => {
    if (!isProcessing && videoStore.youtubeTranscript) {
      try {
        const subject = await db.subjects.get(subjectsStore.selectedSubjectId)
        if (subject?.graph) {
          graphData.value = normalizeGraphPayload(subject.graph)
          await nextTick()
          renderSankey()
        }
      } catch (error) {
        console.error('Error refreshing Sankey graph:', error)
      }
    }
  }
)

onMounted(async () => {
  console.log('[Sankey] 🚀 Component mounted')
  console.log('[Sankey] chartRef on mount:', chartRef.value)
  window.addEventListener('resize', handleResize)
  await nextTick()
  console.log('[Sankey] chartRef after nextTick:', chartRef.value)
  await syncGraphData()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeChart()
})

const handleResize = () => {
  chartInstance.value?.resize()
}
</script>

<style scoped>
@import './graphStyle.css';

.sankey-chart {
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.mindmap-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  min-height: 600px;
}

.graph-wrapper {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  position: relative;
}
</style>
