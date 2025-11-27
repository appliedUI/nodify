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

      <!-- Link Detail Overlay Panel -->
      <Transition name="slide-fade">
        <div
          v-if="showLinkPanel && linkPanelNodes.length"
          class="link-detail-panel"
          @click.self="closeLinkPanel"
        >
          <div class="panel-content">
            <div class="panel-header">
              <div>
                <p class="panel-eyebrow">Connector Insight</p>
                <h3 class="text-lg font-semibold text-white">
                  Connection Details
                </h3>
              </div>
              <button
                @click="closeLinkPanel"
                class="btn btn-ghost btn-sm btn-circle"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="w-5 h-5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div class="panel-body">
              <p class="panel-subtitle">
                Mirrors the Force layout detail view for each connected concept.
              </p>

              <div
                v-for="entry in linkPanelNodes"
                :key="`${entry.node.id}-${entry.key}`"
                class="node-detail-card"
              >
                <div class="node-card-header">
                  <span class="node-role" :class="entry.key">
                    {{ entry.role }}
                  </span>
                  <h4 class="node-title">
                    {{ entry.node.label || entry.node.id }}
                  </h4>
                </div>

                <p class="node-description">
                  {{
                    entry.node.description || 'No description available yet.'
                  }}
                </p>

                <div
                  class="collapse collapse-arrow bg-base-200 whitespace-normal break-words"
                >
                  <input type="checkbox" checked />
                  <div class="collapse-title font-medium">
                    General Knowledge
                  </div>
                  <small class="text-white/50 text-xs flex justify-center pb-4">
                    Links may be broken. Building new agents to fix them.
                  </small>
                  <div class="collapse-content prose prose-invert max-w-none">
                    <div
                      v-if="entry.node.generalKnowledge"
                      v-html="renderMarkdown(entry.node.generalKnowledge)"
                      class="markdown-content"
                      @click="handleMarkdownLinkClick"
                    ></div>
                    <p v-else class="text-sm text-gray-400">
                      No general knowledge captured yet.
                    </p>
                  </div>
                </div>

                <div
                  class="collapse collapse-arrow bg-base-200 whitespace-normal break-words"
                >
                  <input type="checkbox" checked />
                  <div class="collapse-title font-medium">Relationships</div>
                  <div class="collapse-content prose prose-invert max-w-none">
                    <template
                      v-if="
                        entry.node.relationships &&
                        Object.keys(entry.node.relationships).length
                      "
                    >
                      <div
                        v-for="(relations, type) in entry.node.relationships"
                        :key="`${entry.node.id}-${type}`"
                        class="relationship-group"
                      >
                        <div class="relationship-type">
                          {{ formatRelationshipLabel(type) }}
                        </div>
                        <div class="relationship-list">
                          <span
                            v-for="relation in relations"
                            :key="`${entry.node.id}-${type}-${relation}`"
                            class="relationship-badge"
                          >
                            {{ relation }}
                          </span>
                        </div>
                      </div>
                    </template>
                    <p v-else class="text-sm text-gray-400">
                      No relationships recorded.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
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
import MarkdownIt from 'markdown-it'
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
const selectedLink = ref(null)
const showLinkPanel = ref(false)

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
})

const linkPanelNodes = computed(() => {
  if (!selectedLink.value) return []

  const panels = []
  if (selectedLink.value.sourceNode) {
    panels.push({
      role: 'Source Concept',
      key: 'source',
      node: selectedLink.value.sourceNode,
    })
  }
  if (selectedLink.value.targetNode) {
    panels.push({
      role: 'Target Concept',
      key: 'target',
      node: selectedLink.value.targetNode,
    })
  }
  return panels
})

const renderMarkdown = (content) => md.render(content || '')

const formatRelationshipLabel = (label = '') => {
  if (!label) return 'Connections'
  const spaced = label.replace(/([A-Z])/g, ' $1')
  const normalized = spaced.trim()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const handleMarkdownLinkClick = (event) => {
  const target = event.target.closest('a')
  if (target && target.href) {
    event.preventDefault()
    if (window && window.electronAPI) {
      window.electronAPI.openExternal(target.href)
    } else {
      window.open(target.href, '_blank', 'noopener,noreferrer')
    }
  }
}

const closeLinkPanel = () => {
  showLinkPanel.value = false
  selectedLink.value = null
}

const hasGraphData = computed(() => !!graphData.value?.nodes?.length)

const updateGraphType = (type) => emit('update:graphType', type)

const nodeColorScale = ['#FFB703', '#FB8500', '#8ECAE6', '#219EBC', '#A0AEC0']

const initChart = () => {
  if (!chartInstance.value && chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value, undefined, {
      renderer: 'canvas',
    })

    chartInstance.value.on('click', (params) => {
      if (params.dataType !== 'edge') return

      const linkData = params.data.tooltipData
      const sourceNode = graphData.value?.nodes?.find(
        (node) => node.id === params.data.source
      )
      const targetNode = graphData.value?.nodes?.find(
        (node) => node.id === params.data.target
      )

      if (!sourceNode || !targetNode) return

      selectedLink.value = {
        id: `${sourceNode.id}-${targetNode.id}`,
        relationship: linkData?.relationship || 'Related concepts',
        value: params.data.value,
        linkMeta: linkData,
        sourceNode,
        targetNode,
      }
      showLinkPanel.value = true
    })
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
  closeLinkPanel()
  let graph = normalizeGraphPayload(subjectsStore.graph)

  if (!graph?.nodes?.length) {
    const cached = localStorage.getItem('graph')
    if (cached) {
      try {
        graph = normalizeGraphPayload(JSON.parse(cached))
      } catch (error) {
        console.error('[Sankey] Failed to parse cached graph:', error)
      }
    }
  }

  if (!graph?.nodes?.length && subjectsStore.selectedSubjectId) {
    try {
      const subject = await db.subjects.get(subjectsStore.selectedSubjectId)
      graph = normalizeGraphPayload(subject?.graph)
    } catch (error) {
      console.error('[Sankey] Failed to fetch graph from DB:', error)
    }
  }

  graphData.value = graph
  await nextTick()
  renderSankey()
}

const formatGraphForSankey = () => {
  if (!graphData.value?.nodes?.length) {
    return { nodes: [], links: [] }
  }

  const nodeMap = new Map()
  graphData.value.nodes.forEach((node) => {
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

  const sankeyLinks = (graphData.value.links || [])
    .map((link) => {
      const sourceId =
        typeof link.source === 'object' ? link.source.id : link.source
      const targetId =
        typeof link.target === 'object' ? link.target.id : link.target

      const sourceNode = nodeMap.get(sourceId)
      const targetNode = nodeMap.get(targetId)

      if (!sourceNode || !targetNode) {
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
        sourceLabel: sourceNode.label || sourceId,
        targetLabel: targetNode.label || targetId,
        lineStyle: {
          opacity: 0.6,
        },
      }
    })
    .filter(Boolean)

  return { nodes: sankeyNodes, links: sankeyLinks }
}

const renderSankey = () => {
  if (!chartRef.value) return

  initChart()
  const { nodes, links } = formatGraphForSankey()

  if (!nodes.length) {
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

  try {
    chartInstance.value?.setOption(option, true)
    setTimeout(() => {
      chartInstance.value?.resize({
        width: chartRef.value?.offsetWidth || 'auto',
        height: chartRef.value?.offsetHeight || 'auto',
      })
    }, 100)
  } catch (error) {
    console.error('[Sankey] Error rendering chart:', error)
  }
}

const resetView = () => {
  renderSankey()
}

watch(
  () => subjectsStore.graph,
  (newVal, oldVal) => {
    // Only sync if there's actual data or meaningful change
    if (newVal?.nodes?.length || (!newVal && oldVal)) {
      syncGraphData()
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => subjectsStore.selectedSubjectId,
  () => syncGraphData()
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
  window.addEventListener('resize', handleResize)
  await nextTick()
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
  cursor: pointer;
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

/* Link Detail Panel */
.link-detail-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 440px;
  height: 100vh;
  background: rgba(3, 7, 18, 0.55);
  backdrop-filter: blur(12px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.panel-content {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(11, 16, 33, 0.98) 0%,
    rgba(15, 23, 42, 0.98) 100%
  );
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.panel-eyebrow {
  font-size: 0.7rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.panel-subtitle {
  font-size: 0.85rem;
  color: #cbd5f5;
}

.node-detail-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.node-card-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.node-role {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  align-self: flex-start;
}

.node-role.source {
  background: linear-gradient(135deg, #ffb703 0%, #fb8500 100%);
  color: #1a1a1a;
}

.node-role.target {
  background: linear-gradient(135deg, #8ecae6 0%, #219ebc 100%);
  color: #0f172a;
}

.node-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #f8fafc;
}

.node-description {
  font-size: 0.95rem;
  color: #cbd5f5;
}

.relationship-group {
  margin-bottom: 1rem;
}

.relationship-type {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  color: #e2e8f0;
  margin-bottom: 0.35rem;
}

.relationship-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.relationship-badge {
  padding: 0.3rem 0.75rem;
  background: rgba(226, 232, 240, 0.08);
  border-radius: 999px;
  font-size: 0.75rem;
  color: #e2e8f0;
  border: 1px solid rgba(226, 232, 240, 0.12);
}

.markdown-content {
  max-height: 180px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* Transition */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(400px);
  opacity: 0;
}
</style>
