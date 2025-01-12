<template>
  <div class="force-graph-container">
    <div v-if="graphData" class="graph-wrapper">
      <GraphProcessing />
      <!-- Loading Spinner -->
      <div v-if="isLoadingGraph" class="loading-overlay">
        <div class="loading-spinner">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </div>

      <!-- Move graph selector to controls panel -->
      <div class="controls-panel">
        <div class="collapse collapse-arrow bg-base-200/70 backdrop-blur">
          <input type="checkbox" />
          <div class="collapse-title font-medium">Graph Controls</div>
          <div class="collapse-content">
            <div class="flex flex-col gap-4">
              <div>
                <label class="label">
                  <span class="label-text"
                    >Link Distance: {{ linkDistance }}</span
                  >
                </label>
                <input
                  type="range"
                  min="50"
                  max="300"
                  v-model="linkDistance"
                  class="range range-primary range-sm"
                />
              </div>
              <div>
                <label class="label">
                  <span class="label-text"
                    >Charge Strength: {{ chargeStrength }}</span
                  >
                </label>
                <input
                  type="range"
                  min="-1000"
                  max="0"
                  step="50"
                  v-model="chargeStrength"
                  class="range range-primary range-sm"
                />
              </div>
              <div>
                <label class="label">
                  <span class="label-text"
                    >Edge Curvature: {{ edgeCurvature }}</span
                  >
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  v-model="edgeCurvature"
                  class="range range-primary range-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Layout Toggle & Reset Buttons -->
      <div class="fixed-controls">
        <!-- Force Graph Layout -->
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

        <!-- Org Chart Layout -->
        <!-- <button
            class="btn btn-circle btn-sm bg-base-200/70 backdrop-blur tooltip tooltip-top mb-4 p-1"
            @click="updateGraphType('orgChart')"
            :class="{ 'btn-active': graphType === 'orgChart' }"
            data-tip="Org Chart Layout"
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
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
              />
            </svg>
          </button> -->

        <!-- Reset View Button -->
        <button
          class="btn btn-circle btn-sm bg-base-200/70 backdrop-blur tooltip tooltip-top mb-4 p-1"
          @click="resetView"
          data-tip="Reset View and Close All Panels"
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

      <!-- The Mindmap SVG -->
      <div class="mindmap-container">
        <svg
          ref="svgRef"
          @click="handleSvgClick"
          @dblclick="handleSvgDoubleClick"
          style="width: 100%; height: 100%"
        >
          <defs>
            <marker
              :fill="COLORS.edge.arrow"
              id="arrowhead"
              viewBox="0 -5 10 10"
              :refX="NODE_DIAMETER / 2 + COLORS.edge.gap"
              refY="0"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,-5L10,0L0,5" />
            </marker>
          </defs>
          <g ref="zoomLayerRef">
            <g ref="linksRef"></g>
            <g ref="linkLabelsRef"></g>
            <g ref="nodesRef"></g>
          </g>
        </svg>
      </div>

      <!-- Detail Panels -->
      <div
        v-for="panel in openPanels"
        :key="panel.id"
        class="panel-container"
        :class="{
          'panel-inactive': selectedNode?.id !== panel.id,
          'panel-animating': panel.isRepositioning,
        }"
        :style="{
          left: panel.pos.x + 'px',
          top: panel.pos.y + 'px',
          width: panel.width + 'px',
          height: panel.height + 'px',
          zIndex: openPanels.indexOf(panel) + 1,
        }"
        @mousedown="startPanelDrag($event, panel)"
        @click="handlePanelClick(panel.data)"
      >
        <!-- Resize handle - moved outside card content -->
        <div
          class="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize z-50"
          @mousedown.stop="startResize($event, panel)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 18"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4 transform -rotate-45"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 13l-7 7-7-7m14-8l-7 7-7-7"
            />
          </svg>
        </div>

        <div class="card bg-base-100 shadow-xl w-full h-full p-6 relative">
          <!-- Close button -->
          <div class="card-actions justify-end">
            <!-- Expand button -->
            <button
              class="btn btn-square btn-sm z-50"
              @click.stop="toggleExpandPanel(panel)"
              :data-tip="panel.isExpanded ? 'Collapse Panel' : 'Expand Panel'"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>

            <!-- Close button -->
            <button
              class="btn btn-square btn-sm z-50"
              @click.stop="closePanel(panel.id)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
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

          <!-- Panel content -->
          <h2 class="card-title text-white mb-3 -mt-7">
            {{ panel.data.label }}
          </h2>
          <div class="space-y-2 h-[calc(100%-3rem)] overflow-y-auto pr-2">
            <div class="text-md text-gray-300 mb-8">
              {{ panel.data.description }}
            </div>

            <div
              class="collapse collapse-arrow bg-base-200 whitespace-normal break-words"
            >
              <input type="checkbox" checked />
              <div class="collapse-title font-medium">General Knowledge</div>
              <small class="text-white/50 text-xs flex justify-center pb-4">
                Links may be broken. Building new agents to fix them.
              </small>
              <div class="collapse-content prose prose-invert max-w-none">
                <div class="flex justify-between items-center mb-2"></div>
                <span class="absolute top-[14px] right-[40px] z-[9999]">
                  <div class="relative group">
                    <component
                      :is="showCheckMark ? CheckCircleIcon : PlusCircleIcon"
                      class="w-5 h-5 inline-block cursor-pointer transition-colors"
                      :class="
                        showCheckMark
                          ? 'text-green-500'
                          : 'text-white hover:text-blue-400'
                      "
                      @click="sendMarkdown(panel.data.generalKnowledge)"
                    />
                    <div
                      class="absolute top-1/2 right-full transform -translate-y-1/2 mr-2 px-2 py-1 text-xs bg-gray-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[99999]"
                    >
                      {{
                        showCheckMark
                          ? 'Content sent to notes'
                          : 'Send to notes'
                      }}
                      <div
                        class="absolute top-1/2 left-full -translate-y-1/2 w-0 h-0 border-4 border-solid border-transparent border-l-gray-700"
                      ></div>
                    </div>
                  </div>
                </span>
                <div
                  v-html="md.render(panel.data.generalKnowledge || '')"
                  class="markdown-content"
                  @click="handleMarkdownLinkClick"
                  style="height: 168px; overflow-y: auto"
                ></div>
              </div>
            </div>
            <div
              class="collapse collapse-arrow bg-base-200 whitespace-normal break-words"
            >
              <input type="checkbox" checked />
              <div class="collapse-title font-medium">Relationships</div>
              <div class="collapse-content prose prose-invert max-w-none">
                <div class="space-y-2">
                  <div
                    v-for="(relation, type) in panel.data.relationships"
                    :key="type"
                    class="flex flex-col gap-2"
                  >
                    <div class="font-semibold capitalize">{{ type }}:</div>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="name in relation"
                        :key="name"
                        class="badge badge-neutral hover:badge-accent hover:text-white cursor-pointer transition-colors"
                        @click.stop="handleRelationClick(name)"
                      >
                        {{ name }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Keep only this instance of SimulationProgress -->
      <SimulationProgress :show="isSavingState" :progress="saveProgress" />
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
/* Imports & Setup */
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import { useSubjectsStore } from '@/stores/subjectsStore'
import { db } from '@/db/db'
import SimulationProgress from './components/SimulationProgress.vue'
import MarkdownIt from 'markdown-it'
import 'prismjs/themes/prism-tomorrow.css'
import Prism from 'prismjs'
import ClipboardJS from 'clipboard'
import OpenAIKeyInput from '@/atoms/OpenAIKeyInput.vue'
import GraphProcessing from './composables/graphProcessing.vue'
import { PlusCircleIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { useVideoStore } from '@/stores/videoStore'
import { useNotesStore } from '@/stores/notesStore'

const apikeyState = ref(localStorage.getItem('openai_key'))

// Initialize markdown parser
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && Prism.languages[lang]) {
      try {
        return `<pre class="language-${lang} relative" style="white-space: pre-wrap; word-wrap: break-word;"><button class="copy-btn absolute top-2 right-2 btn btn-xs btn-ghost" data-clipboard-text="${str}">Copy</button><code class="language-${lang}" style="white-space: pre-wrap; word-wrap: break-word;">${Prism.highlight(
          str,
          Prism.languages[lang],
          lang
        )}</code></pre>`
      } catch (__) {}
    }
    return `<pre class="language-text" style="white-space: pre-wrap; word-wrap: break-word;"><code style="white-space: pre-wrap; word-wrap: break-word;">${md.utils.escapeHtml(
      str
    )}</code></pre>`
  },
})

onMounted(() => {
  // Initialize clipboard
  const clipboard = new ClipboardJS('.copy-btn')
  clipboard.on('success', (e) => {
    const btn = e.trigger
    btn.textContent = 'Copied!'
    setTimeout(() => {
      btn.textContent = 'Copy'
    }, 2000)
  })
})

const subjectsStore = useSubjectsStore()
const videoStore = useVideoStore()

const graphData = ref(null)

/* Progress tracking */
const isSavingState = ref(false)
const saveProgress = ref(0)

/* Refs to DOM elements */
const svgRef = ref(null)
const zoomLayerRef = ref(null)
const linksRef = ref(null)
const linkLabelsRef = ref(null)
const nodesRef = ref(null)

/* Data Management */
const mindmapData = ref({ nodes: [], links: [] })
const nodes = ref([])
const links = ref([])
const simulation = ref(null)
let zoomBehavior = null

/* Initialize controls with saved values from store */
const storeState = subjectsStore.graphState || {}

const chargeStrength = ref(storeState.controls?.chargeStrength ?? 0)
const linkDistance = ref(300)
const edgeCurvature = ref(storeState.controls?.edgeCurvature ?? 0.2)
const collideRadius = ref(storeState.controls?.collideRadius ?? 60)

/* Chart dimensions */
const WIDTH = 1200
const HEIGHT = 800

/* Circle diameter */
const NODE_DIAMETER = 80

/* Colors */
const COLORS = {
  root: '#000',
  child: '#0C1519',
  grandchild: '#0C1519',
  selected: '#F48C06', // Common selected color
  link: '#222222',
  text: '#FDFDFD',
  arrow: '#E6E6E6',
  background: '#101010',
  strokeDefault: '#000', // Common stroke color
  nodeText: '#FFFFFF',
  labelText: '#999999',
  edge: {
    line: '#444444',
    arrow: '#666666',
    width: 2,
    gap: 3.5,
  },
  node: {
    strokeWidth: 2,
    activeStrokeWidth: 6,
  },
}

/* Node selection/panel states */
const lastClickedNodeId = ref(null)
const selectedNode = ref(null)
const openPanels = ref([])

/* Panel layout constants */
const PANEL_WIDTH = 384 // w-96 = 384px
const PANEL_HEIGHT = 400
const PANEL_MARGIN = 20
const PANEL_START_X = 20
const PANEL_START_Y = 20
const PANELS_PER_ROW = 3

const PANEL_OFFSET_X = -224
const PANEL_OFFSET_Y = 70

/* Props & Emits */
const props = defineProps({
  graphType: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:graphType'])

/* Graph Type Update Function */
const updateGraphType = (value) => {
  emit('update:graphType', value)
}

/* Add loading and initialization flags */
const isLoadingGraph = ref(false)
const isInitializing = ref(false)

/* Watch store for subject selection changes */
watch(
  () => subjectsStore.selectedSubjectId,
  (newVal, oldVal) => {
    // If user deselected or subject was deleted
    if (!newVal) {
      initializeGraph(null)
    }
    // If user switched from one subject to another
    else if (newVal !== oldVal) {
      // Force clear before the new subject's graph arrives
      initializeGraph(null)
    }
  }
)

/* Watch for store.graph changes */
watch(
  () => subjectsStore.graph,
  async (newGraph) => {
    try {
      isLoadingGraph.value = true
      if (newGraph && Object.keys(newGraph).length > 0) {
        await initializeGraph(newGraph)
      } else {
        await initializeGraph(null)
      }
    } catch (error) {
      console.error('Error initializing graph:', error)
    } finally {
      isLoadingGraph.value = false
    }
  },
  { immediate: true }
)

/* Watch for force-control changes => update forces */
watch([linkDistance, chargeStrength, collideRadius, edgeCurvature], () => {
  if (!isInitializing.value) {
    updateForces()
    // Save control changes immediately
    saveCurrentGraphState()
  }
})

/* Watch node positions + transform changes => save state */
watch(
  () => ({
    positions: nodes.value.map((n) => ({ x: n.x, y: n.y })),
    transform:
      zoomBehavior && svgRef.value ? d3.zoomTransform(svgRef.value) : null,
    controls: {
      linkDistance: linkDistance.value,
      chargeStrength: chargeStrength.value,
      edgeCurvature: edgeCurvature.value,
      collideRadius: collideRadius.value,
    },
  }),
  () => {
    if (svgRef.value && nodes.value.length > 0) {
      saveCurrentGraphState()
    }
  },
  { deep: true }
)

/* ────────────────────────────────────────────────────────────────────────── */
/* Event Listeners                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

/* Listen for a custom event to set the current subject */
const currentSubject = ref(null)
window.addEventListener('setCurrentSubject', (event) => {
  const subjectId = event.detail.subjectId
  currentSubject.value = subjectId
  loadGraphForSubject(subjectId)
})

/* Listen for storage changes */
function handleStorageChange(event) {
  if (event.key === 'graph') {
    try {
      const parsed = JSON.parse(event.newValue)
      mindmapData.value = parsed
      nodes.value = [...(parsed.nodes || [])]
      links.value = [...(parsed.links || [])]

      // Initialize or update simulation
      if (simulation.value) {
        simulation.value.nodes(nodes.value)
        simulation.value.force('link').links(links.value)
        simulation.value.alpha(1).restart()
      } else {
        renderMindMap()
      }
    } catch (error) {
      console.error('Error parsing updated graph data:', error)
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Lifecycle Hooks                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

onMounted(async () => {
  try {
    await nextTick()
    // Check for OpenAI key in both store and localStorage
    if (!subjectsStore.OpenAIKeyState && !apikeyState.value) {
      // If no key exists in either location, show the input
      apikeyState.value = null
    }
    // Initialize with empty state - wait for subject selection
    await initializeGraph(null)
    window.addEventListener('storage', handleStorageChange)
    subjectsStore.watchLocalStorageChanges()
  } catch (error) {
    console.error('Error in onMounted:', error)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorageChange)
  if (simulation.value) {
    simulation.value.stop()
    simulation.value = null
  }
  zoomBehavior = null
})

/* ────────────────────────────────────────────────────────────────────────── */
/* Functions                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

async function loadGraphForSubject(subjectId) {
  try {
    const subject = await db.subjects.get(subjectId)
    if (subject && subject.graph) {
      mindmapData.value = subject.graph
      nodes.value = [...(subject.graph.nodes || [])]
      links.value = [...(subject.graph.links || [])]

      if (simulation.value) {
        simulation.value.nodes(nodes.value)
        simulation.value.force('link').links(links.value)
        simulation.value.alpha(1).restart()
      } else {
        await renderMindMap()
      }
    } else {
      // Handle case where subject.graph is undefined or empty
      mindmapData.value = { nodes: [], links: [] }
      nodes.value = []
      links.value = []
      initializeGraph(null)
    }
  } catch (error) {
    console.error('Error loading graph for subject:', error)
  }
}

function highlightNode(nodeId) {
  // Reset all nodes to default style
  d3.selectAll('.node-shape')
    .attr('stroke', COLORS.strokeDefault)
    .attr('stroke-width', COLORS.node.strokeWidth)

  // Highlight the selected node
  d3.selectAll('.node')
    .filter((d) => d.id === nodeId)
    .select('.node-shape')
    .attr('stroke', COLORS.selected)
    .attr('stroke-width', COLORS.node.activeStrokeWidth)

  lastClickedNodeId.value = nodeId
}

function handleNodeClick(event, d) {
  event.stopPropagation()
  highlightNode(d.id)
  openDetailPanel(d)
  zoomToNode(d)
  saveCurrentGraphState()
}

function handleNodeDoubleClick(event, d) {
  event.stopPropagation()
  openDetailPanel(d)
  zoomToNode(d)
}

function openDetailPanel(nodeData) {
  if (!openPanels.value.find((panel) => panel.id === nodeData.id)) {
    const panelIndex = openPanels.value.length
    const row = Math.floor(panelIndex / PANELS_PER_ROW)
    const col = panelIndex % PANELS_PER_ROW

    selectedNode.value = nodeData

    const newPanel = {
      id: nodeData.id,
      data: nodeData,
      width: 384, // Initial width (w-96 = 384px)
      height: 750, // Initial height
      pos: {
        x: 10 + col * (PANEL_WIDTH + PANEL_MARGIN), // Fixed 240px from left
        y: PANEL_START_Y + row * (PANEL_HEIGHT + PANEL_MARGIN) + PANEL_OFFSET_Y,
      },
    }

    openPanels.value.push(newPanel)

    // Create a serializable state
    const currentState = subjectsStore.graphState || {}
    const updatedState = {
      ...currentState,
      openPanels: openPanels.value.map((p) => ({
        id: p.id,
        pos: {
          x: p.pos.x,
          y: p.pos.y,
        },
      })),
      selectedNodeId: selectedNode.value?.id,
    }

    subjectsStore.saveGraphState(updatedState)
  } else {
    selectedNode.value = nodeData
  }
}

function zoomToNode(d) {
  if (!zoomBehavior) return

  const svgEl = d3.select(svgRef.value)
  const scale = 2.0
  const xOffset = WIDTH * -0.3
  const yOffset = HEIGHT * -0.3

  const transform = d3.zoomIdentity
    .translate(WIDTH / 2 - xOffset, HEIGHT / 2 - yOffset)
    .scale(scale)
    .translate(-d.x, -d.y)

  svgEl.transition().duration(750).call(zoomBehavior.transform, transform)
}

function recalculatePanelPositions() {
  openPanels.value.forEach((panel, index) => {
    const row = Math.floor(index / PANELS_PER_ROW)
    const col = index % PANELS_PER_ROW

    panel.isRepositioning = true
    panel.pos = {
      x: 10 + col * (PANEL_WIDTH + PANEL_MARGIN), // Fixed 240px from left
      y: PANEL_START_Y + row * (PANEL_HEIGHT + PANEL_MARGIN) + PANEL_OFFSET_Y,
    }

    setTimeout(() => {
      panel.isRepositioning = false
    }, 300)
  })
}

function closePanel(panelId) {
  openPanels.value = openPanels.value.filter((panel) => panel.id !== panelId)
  recalculatePanelPositions()

  // Save updated panels to graphState
  const currentState = subjectsStore.graphState || {}
  const updatedState = {
    ...currentState,
    openPanels: openPanels.value.map((p) => ({
      id: p.id,
      pos: p.pos,
    })),
  }

  subjectsStore.saveGraphState(updatedState)
}

/* Force-based Dragging */
function dragStarted(event, d) {
  if (!event.active) simulation.value.alphaTarget(0.3).restart()
  d.fx = d.x
  d.fy = d.y
  d3.select(this).raise().classed('active', true)
}

function dragged(event, d) {
  d.fx = event.x
  d.fy = event.y
}

function dragEnded(event, d) {
  if (!event.active) simulation.value.alphaTarget(0)
  d.fx = null
  d.fy = null
  d3.select(this).classed('active', false)

  // Save after drag ends
  if (!isInitializing.value) {
    saveNodePositions()
  }
}

function getNodeColor(d) {
  // First get the base color based on level
  let baseColor = COLORS.root
  if (d.level === 1) baseColor = COLORS.child
  else if (d.level > 1) baseColor = COLORS.grandchild

  // Then adjust based on importance
  return getImportanceColor(baseColor, d.importance)
}

function getImportanceColor(baseColor, importance) {
  if (importance >= 9) {
    return baseColor // Full color for high importance
  } else if (importance >= 5) {
    // Semi-transparent for medium importance
    return `rgba(0, 0, 0, 1)` // Hard-coded black with 0.6 opacity
  } else {
    // Very transparent for low importance
    return `rgba(0, 0, 0, 0.1)` // Hard-coded black with 0.3 opacity
  }
}

function initializeZoom() {
  if (!svgRef.value || !zoomLayerRef.value) return

  zoomBehavior = d3
    .zoom()
    .scaleExtent([0.3, 2])
    .on('zoom', (event) => {
      const transform = event.transform
      d3.select(zoomLayerRef.value).attr('transform', transform)

      // Save zoom state to store
      const currentState = subjectsStore.graphState || {}
      subjectsStore.saveGraphState({
        ...currentState,
        transform: { x: transform.x, y: transform.y, k: transform.k },
      })
    })

  // Apply saved transform from store
  const storeState = subjectsStore.graphState || {}
  const { x = 0, y = 0, k = 1 } = storeState.transform || {}
  d3.select(svgRef.value)
    .call(zoomBehavior)
    .call(zoomBehavior.transform, d3.zoomIdentity.translate(x, y).scale(k))
}

async function renderMindMap() {
  if (!mindmapData.value?.nodes?.length) {
    console.warn('No nodes data available')
    return
  }

  // Wait for refs to be available
  await nextTick()
  if (!svgRef.value || !zoomLayerRef.value) {
    console.warn('SVG refs not ready')
    return
  }

  // Initialize zoom before other operations
  initializeZoom()

  // Create the force simulation
  simulation.value = d3
    .forceSimulation(nodes.value)
    .alphaDecay(0.05)
    .alphaMin(0.1)
    .velocityDecay(0.4)

  await updateForces()

  // Load saved positions from store if they exist
  const storeState = subjectsStore.graphState || {}
  if (storeState.nodePositions) {
    nodes.value.forEach((node) => {
      const savedPos = storeState.nodePositions[node.id]
      if (savedPos) {
        node.x = savedPos.x
        node.y = savedPos.y
        node.fx = savedPos.fx
        node.fy = savedPos.fy
      }
    })
  }

  // Draw everything
  drawLinks()
  drawLinkLabels()
  drawNodes()

  // Set up simulation tick handler and end event
  simulation.value
    .on('tick', () => {
      updatePositions()
    })
    .on('end', () => {
      // Only save positions when simulation ends and we're not initializing
      if (!isInitializing.value) {
        console.log('Simulation settled. Saving final node positions...')
        saveNodePositions()
      }
    })
}

function updateForces() {
  if (!simulation.value) return

  simulation.value
    .force(
      'link',
      d3
        .forceLink(links.value)
        .id((d) => d.id)
        .distance(linkDistance.value)
    )
    .force('charge', d3.forceManyBody().strength(chargeStrength.value))
    .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
    .force('collide', d3.forceCollide(NODE_DIAMETER / 2 + collideRadius.value))
    // Add these parameters to speed up simulation
    .alphaDecay(0.05) // Increase decay rate (default is 0.0228)
    .alphaMin(0.1) // Increase minimum alpha (default is 0.001)
    .velocityDecay(0.4) // Adjust velocity decay (default is 0.4)

  simulation.value.alpha(1).restart()
}

function saveNodePositions() {
  const nodePositions = {}
  nodes.value.forEach((node) => {
    nodePositions[node.id] = {
      x: node.x,
      y: node.y,
      fx: node.fx,
      fy: node.fy,
    }
  })

  // Merge with existing store state
  const currentState = subjectsStore.graphState || {}
  const updatedState = {
    ...currentState,
    nodePositions,
  }

  subjectsStore.saveGraphState(updatedState)
}

async function initializeGraph(data) {
  isInitializing.value = true

  // Clear existing state first
  if (simulation.value) {
    simulation.value.stop()
    simulation.value = null
  }

  if (zoomBehavior) {
    zoomBehavior = null
  }

  if (!data) {
    graphData.value = null
    mindmapData.value = { nodes: [], links: [] }
    nodes.value = []
    links.value = []
    d3.select(zoomLayerRef.value).selectAll('*').remove()
    d3.select(linksRef.value).selectAll('*').remove()
    d3.select(linkLabelsRef.value).selectAll('*').remove()
    d3.select(nodesRef.value).selectAll('*').remove()
    openPanels.value = []
    selectedNode.value = null
    simulation.value?.stop()
    isInitializing.value = false
    return
  }

  try {
    graphData.value = data
    mindmapData.value = data
    nodes.value = [...(data.nodes || [])]
    links.value = [...(data.links || [])]

    await nextTick()

    if (simulation.value) {
      simulation.value.stop()
      simulation.value = null
    }

    simulation.value = d3.forceSimulation(nodes.value)

    if (nodes.value.length > 0) {
      // Restore from store if available
      const storeState = subjectsStore.graphState
      if (storeState) {
        // Restore node positions
        if (storeState.nodePositions) {
          nodes.value.forEach((node) => {
            const savedPos = storeState.nodePositions[node.id]
            if (savedPos) {
              node.x = savedPos.x
              node.y = savedPos.y
              node.fx = savedPos.fx
              node.fy = savedPos.fy
            }
          })
        }

        // Restore transform/zoom
        if (storeState.transform) {
          const { x, y, k } = storeState.transform
          if (svgRef.value && zoomBehavior) {
            d3.select(svgRef.value)
              .transition()
              .duration(750)
              .call(
                zoomBehavior.transform,
                d3.zoomIdentity.translate(x, y).scale(k)
              )
          }
        }

        // Restore controls
        if (storeState.controls) {
          linkDistance.value = storeState.controls.linkDistance
          chargeStrength.value = storeState.controls.chargeStrength
          edgeCurvature.value = storeState.controls.edgeCurvature
          collideRadius.value = storeState.controls.collideRadius
        }

        // Restore panel dimensions
        if (storeState.panelDimensions) {
          openPanels.value.forEach((panel) => {
            const dimensions = storeState.panelDimensions[panel.id]
            if (dimensions) {
              panel.width = dimensions.width
              panel.height = dimensions.height
            }
          })
        }
      }

      await renderMindMap()
      simulation.value.alpha(1).restart()
    }
  } catch (error) {
    console.error('Error initializing graph:', error)
  } finally {
    // Wait a bit before allowing saves to ensure everything is settled
    setTimeout(() => {
      isInitializing.value = false
    }, 1000)
  }
}

function drawLinks() {
  d3.select(linksRef.value)
    .selectAll('path.link')
    .data(links.value)
    .join('path')
    .attr('class', 'link')
    .attr('stroke', COLORS.edge.line)
    .attr('stroke-width', COLORS.edge.width)
    .attr('fill', 'none')
    .attr('marker-end', 'url(#arrowhead)')
    .attr('d', (d) => {
      if (!d.source?.x || !d.source?.y || !d.target?.x || !d.target?.y)
        return null

      const sourceX = isValidNumber(d.source.x) ? d.source.x : 0
      const sourceY = isValidNumber(d.source.y) ? d.source.y : 0
      const targetX = isValidNumber(d.target.x) ? d.target.x : 0
      const targetY = isValidNumber(d.target.y) ? d.target.y : 0

      const dx = targetX - sourceX
      const dy = targetY - sourceY
      const controlX = sourceX + dx / 2
      const controlY = sourceY + dy / 2 - dy * edgeCurvature.value

      return d3.line().curve(d3.curveNatural)([
        [sourceX, sourceY],
        [controlX, controlY],
        [targetX, targetY],
      ])
    })
}

function drawLinkLabels() {
  d3.select(linkLabelsRef.value)
    .selectAll('text.link-label')
    .data(links.value)
    .join('text')
    .attr('class', 'link-label')
    .attr('fill', COLORS.labelText)
    .attr('font-size', '14px')
    .attr('text-anchor', 'middle')
    .text((d) => d.relationship || '')
    .attr('dy', (d) => {
      const dx = (d.target.x || 0) - (d.source.x || 0)
      const dy = (d.target.y || 0) - (d.source.y || 0)
      const angle = Math.atan2(dy, dx)
      return angle > 0 ? '-15px' : '15px'
    })
}

function drawNodes() {
  const nodesElSelection = d3
    .select(nodesRef.value)
    .selectAll('g.node')
    .data(nodes.value)
    .join('g')
    .attr('class', 'node')
    .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
    .on('click', handleNodeClick)
    .on('dblclick', handleNodeDoubleClick)
    .call(
      d3
        .drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
    )

  // Circle
  nodesElSelection
    .append('circle')
    .attr('class', 'node-shape')
    .attr('r', NODE_DIAMETER / 2)
    .attr('fill', (d) => getNodeColor(d))
    .attr('stroke', COLORS.strokeDefault)
    .attr('stroke-width', COLORS.node.strokeWidth)

  // Label
  nodesElSelection
    .append('text')
    .text((d) => d.label)
    .attr('class', 'node-label')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', COLORS.nodeText)
    .attr('font-size', '18px')
    .attr('font-weight', 'bold')
    .style('text-shadow', '0 0 9px #000')
}

function updatePositions() {
  // Update curved links
  d3.select(linksRef.value)
    .selectAll('path.link')
    .attr('d', (d) => {
      const sourceX = d.source.x
      const sourceY = d.source.y
      const targetX = d.target.x
      const targetY = d.target.y

      const dx = targetX - sourceX
      const dy = targetY - sourceY
      const controlX = sourceX + dx / 2
      const controlY = sourceY + dy / 2 - dy * edgeCurvature.value

      return d3.line().curve(d3.curveNatural)([
        [sourceX, sourceY],
        [controlX, controlY],
        [targetX, targetY],
      ])
    })

  // Update node positions
  d3.select(nodesRef.value)
    .selectAll('g.node')
    .attr('transform', (d) => `translate(${d.x}, ${d.y})`)

  // Update link labels
  d3.select(linkLabelsRef.value)
    .selectAll('text.link-label')
    .attr('x', (d) => (d.source.x + d.target.x) / 2)
    .attr('y', (d) => (d.source.y + d.target.y) / 2)
    .attr('dy', (d) => {
      const dx = d.target.x - d.source.x
      const dy = d.target.y - d.source.y
      const angle = Math.atan2(dy, dx)
      return angle > 0 ? '-16px' : '0'
    })
}

function startPanelDrag(event, panel) {
  const initialX = panel.pos.x
  const initialY = panel.pos.y
  const initialMouseX = event.clientX
  const initialMouseY = event.clientY

  function onPanelDrag(e) {
    panel.pos.x = initialX + (e.clientX - initialMouseX)
    panel.pos.y = initialY + (e.clientY - initialMouseY)
  }

  function stopPanelDrag() {
    window.removeEventListener('mousemove', onPanelDrag)
    window.removeEventListener('mouseup', stopPanelDrag)
    saveCurrentGraphState()
  }

  window.addEventListener('mousemove', onPanelDrag)
  window.addEventListener('mouseup', stopPanelDrag)
}

function handleRelationClick(nodeName) {
  const node = nodes.value.find((n) => {
    const normalizedNodeLabel = n.label.toLowerCase().trim()
    const normalizedSearchName = nodeName.toLowerCase().trim()
    if (normalizedNodeLabel === normalizedSearchName) return true

    // Also handle punctuation differences
    if (
      normalizedNodeLabel.replace(/[^a-z0-9]/gi, '') ===
      normalizedSearchName.replace(/[^a-z0-9]/gi, '')
    ) {
      return true
    }
    return false
  })

  if (node) {
    selectedNode.value = node
    highlightNode(node.id)
    openDetailPanel(node)
    zoomToNode(node)
  }
}

function handlePanelClick(nodeData) {
  selectedNode.value = nodeData
  const node = nodes.value.find((n) => n.id === nodeData.id)
  if (node) {
    highlightNode(node.id)
    zoomToNode(node)
  }
}

function handleSvgClick() {
  d3.selectAll('.node-shape')
    .attr('stroke', COLORS.strokeDefault)
    .attr('stroke-width', 1.5)
  lastClickedNodeId.value = null
}

function resetView() {
  if (!zoomBehavior || !svgRef.value) return

  // Clear all open panels
  openPanels.value = []
  selectedNode.value = null

  // Reset node highlights
  d3.selectAll('.node-shape')
    .attr('stroke', COLORS.strokeDefault)
    .attr('stroke-width', COLORS.node.strokeWidth)

  // Reset to default zoom and center
  const svgEl = d3.select(svgRef.value)
  const transform = d3.zoomIdentity
    .translate(-WIDTH / 300, -HEIGHT / 111)
    .scale(1)

  // Apply the transform with a smooth transition
  svgEl.transition().duration(750).call(zoomBehavior.transform, transform)

  // Save the reset state
  const currentState = subjectsStore.graphState || {}
  const updatedState = {
    ...currentState,
    transform: { x: -WIDTH / 2, y: -HEIGHT / 2, k: 1 },
    openPanels: [],
    selectedNodeId: null,
  }
  subjectsStore.saveGraphState(updatedState)
}

function isValidNumber(n) {
  return typeof n === 'number' && !isNaN(n) && isFinite(n)
}

/* Debounce to prevent excessive state saves */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Reduce debounce delay from 500ms to 200ms
const saveCurrentGraphState = debounce(async () => {
  try {
    if (!svgRef.value || !nodes.value.length) return

    isSavingState.value = true
    saveProgress.value = 30

    const state = {
      nodePositions: {},
      transform:
        zoomBehavior && svgRef.value
          ? d3.zoomTransform(svgRef.value)
          : { x: 0, y: 0, k: 1 },
      controls: {
        linkDistance: linkDistance.value,
        chargeStrength: chargeStrength.value,
        edgeCurvature: edgeCurvature.value,
        collideRadius: collideRadius.value,
      },
      panelDimensions: openPanels.value.reduce((acc, panel) => {
        acc[panel.id] = { width: panel.width, height: panel.height }
        return acc
      }, {}),
    }

    saveProgress.value = 60

    nodes.value.forEach((node) => {
      if (isValidNumber(node.x) && isValidNumber(node.y)) {
        state.nodePositions[node.id] = {
          x: node.x,
          y: node.y,
          fx: isValidNumber(node.fx) ? node.fx : null,
          fy: isValidNumber(node.fy) ? node.fy : null,
        }
      }
    })

    saveProgress.value = 80

    if (Object.keys(state.nodePositions).length > 0) {
      await subjectsStore.saveGraphState(state)
    }

    saveProgress.value = 100

    // Hide progress after a short delay
    setTimeout(() => {
      isSavingState.value = false
      saveProgress.value = 0
    }, 500)
  } catch (error) {
    console.error('Error saving graph state:', error)
    isSavingState.value = false
    saveProgress.value = 0
  }
}, 200) // Changed from 500 to 200ms

function handleMarkdownLinkClick(event) {
  const target = event.target.closest('a')
  if (target && target.href) {
    event.preventDefault()
    if (window.electronAPI) {
      window.electronAPI.openExternal(target.href)
    } else {
      // Fallback for web version
      window.open(target.href, '_blank', 'noopener,noreferrer')
    }
  }
}

function startResize(event, panel) {
  event.preventDefault()
  const initialWidth = panel.width
  const initialHeight = panel.height
  const initialMouseX = event.clientX
  const initialMouseY = event.clientY

  function onResize(e) {
    const deltaX = e.clientX - initialMouseX
    const deltaY = e.clientY - initialMouseY
    panel.width = Math.max(300, initialWidth + deltaX) // Minimum width of 300px
    panel.height = Math.max(200, initialHeight + deltaY) // Minimum height of 200px
  }

  function stopResize() {
    window.removeEventListener('mousemove', onResize)
    window.removeEventListener('mouseup', stopResize)
    saveCurrentGraphState()
  }

  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}

const showCheckMark = ref(false)

function sendMarkdown(content) {
  const notesStore = useNotesStore()

  try {
    const workspaceId = localStorage.getItem('workspaceUUID')
    if (!workspaceId) {
      console.error('No workspace selected')
      return
    }

    // Set the current workspace in the store
    notesStore
      .setCurrentWorkspace(workspaceId)
      .then(() => {
        // Save the content to notes
        return notesStore.sendMarkdown(content)
      })
      .then(() => {
        showCheckMark.value = true
        setTimeout(() => {
          showCheckMark.value = false
        }, 2000)
      })
      .catch((err) => {
        console.error('Failed to save markdown:', err)
      })
  } catch (error) {
    console.error('Error saving markdown:', error)
  }
}

// Add this watcher in your setup() or script setup section
watch(
  () => openPanels.value.length,
  (newLength, oldLength) => {
    if (newLength === 0 && oldLength > 0) {
      resetView()
    }
  }
)

// Add a watch for video store processing state
watch(
  () => videoStore.isVideoProcessing,
  async (isProcessing) => {
    // When video processing completes
    if (!isProcessing && videoStore.youtubeTranscript) {
      try {
        isLoadingGraph.value = true
        const subject = await db.subjects.get(subjectsStore.selectedSubjectId)
        if (subject?.graph) {
          await initializeGraph(subject.graph)
        }
      } catch (error) {
        console.error('Error initializing graph:', error)
      } finally {
        isLoadingGraph.value = false
      }
    }
  }
)

// Toggle function with adjustable height
function toggleExpandPanel(panel, options = {}) {
  const {
    heightOffset = 90, // Default offset from top
    widthOffset = 100, // Default offset from left
    expandedHeight = HEIGHT - 100, // Default expanded height
    expandedWidth = WIDTH * 0.6, // Default expanded width
    manualHeight = 700, // Allow manual height override
    manualWidth = null, // Allow manual width override
    manualOffset = null, // Allow manual offset override
  } = options

  if (panel.isExpanded) {
    // Restore original size and position for all panels
    openPanels.value.forEach((p) => {
      if (p.isExpanded) {
        p.width = p.originalDimensions.width
        p.height = p.originalDimensions.height
        p.pos = { ...p.originalPosition }
        p.isExpanded = false
      }
    })
  } else {
    // First collapse any expanded panels
    openPanels.value.forEach((p) => {
      if (p.isExpanded) {
        p.width = p.originalDimensions.width
        p.height = p.originalDimensions.height
        p.pos = { ...p.originalPosition }
        p.isExpanded = false
      }
    })

    // Save current dimensions and position for the clicked panel
    panel.originalDimensions = { width: panel.width, height: panel.height }
    panel.originalPosition = { ...panel.pos }

    // Expand the clicked panel with manual or default dimensions
    panel.width = manualWidth || expandedWidth
    panel.height = manualHeight || expandedHeight
    panel.pos = {
      x: 10,
      y: manualOffset || heightOffset,
    }
    panel.isExpanded = true

    // Expand all accordions within the panel
    nextTick(() => {
      const accordions = document.querySelectorAll(
        `#panel-${panel.id} .collapse input[type="checkbox"]`
      )
      accordions.forEach((accordion) => {
        accordion.checked = true
      })
    })
  }

  saveCurrentGraphState()
}
</script>

<style scoped>
@import './graphStyle.css';

.panel-container {
  position: absolute;
  resize: none; /* Disable default resize */
}

.panel-container .card {
  overflow: auto;
}

.tooltip {
  position: relative;
  z-index: 999;
}

.tooltip::before {
  content: attr(data-tip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  z-index: 999;
  transform: translateX(-50%);
  padding: 0.25rem 0.5rem;
  background-color: #333;
  color: #fff;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease;
}

.tooltip:hover::before {
  opacity: 1;
  visibility: visible;
  z-index: 999;
}
</style>
