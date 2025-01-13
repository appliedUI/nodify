import { defineStore } from 'pinia'
import { useSubjectsStore } from './subjectsStore'
import { db } from '@/db/db'
import { graphStateManager } from '@/modules/workspace/helpers/graphStateManager'
import * as d3 from 'd3'

export const useGraphForceStore = defineStore('graphForce', {
  state: () => ({
    graph: {
      nodes: [],
      links: [],
    },
    //add loading state
    graphLoading: false,
    openaiProgress: 0,
    simulation: null, // Add simulation reference
  }),
  actions: {
    //setGraphLoading
    setGraphLoading(value) {
      this.graphLoading = value
      if (!value) {
        this.openaiProgress = 0
      }
    },
    updateProgress(progress) {
      if (progress.isComplete) {
        this.openaiProgress = 100
        setTimeout(() => {
          this.graphLoading = false
          this.openaiProgress = 0
        }, 500)
      } else {
        this.openaiProgress = Math.round(progress.progress * 100)
      }
    },
    async generateGraphWithOpenAI(transcript) {
      try {
        //load
        this.graphLoading = true
        this.openaiProgress = 0
        // clear any graph that is stored
        this.graph = { nodes: [], links: [] }

        // Set up OpenAI progress listener
        window.electronAPI.onOpenaiProgress((event, progress) => {
          this.updateProgress(progress)
        })

        const payload = {
          apiKey: localStorage.getItem('openai_key'),
          transcript: transcript,
        }

        const graphData = await window.electronAPI.generateGraphWithOpenAI(payload)
        //log
        console.log('Generated graph:', graphData)
        //set the graph data to the subject store
        const subjectsStore = useSubjectsStore()
        subjectsStore.setGraph(graphData)
        //replace any graph that is already stored
        this.graph = graphData
        // Initialize force simulation
        this.initializeForceSimulation(graphData)
      } catch (error) {
        console.error('Error generating graph:', error)
        this.graphLoading = false
      }
    },

    cleanGraphData(graphData) {
      if (!graphData) return { nodes: [], links: [] }

      // Create clean nodes
      const nodes = graphData.nodes?.map(node => ({
        id: node.id,
        label: node.label || node.name,
        level: node.level || 1,
        description: node.description,
        relationships: node.relationships || { connections: [] },
        generalKnowledge: node.generalKnowledge,
        importance: node.importance || 5,
        children: node.children || []
      })) || []

      // Create a map of nodes by ID
      const nodeMap = new Map(nodes.map(node => [node.id, node]))

      // Process links to ensure proper node references
      const links = (graphData.links || []).map(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source
        const targetId = typeof link.target === 'object' ? link.target.id : link.target
        
        return {
          source: nodeMap.get(sourceId),
          target: nodeMap.get(targetId),
          relationship: link.relationship
        }
      }).filter(link => link.source && link.target)

      return { nodes, links }
    },

    initializeForceSimulation(graphData) {
      if (this.simulation) {
        this.simulation.stop()
      }

      const cleanedGraph = this.cleanGraphData(graphData)
      this.graph = cleanedGraph

      // Get graphState from localStorage first, fall back to state manager
      const localGraphState = JSON.parse(localStorage.getItem('graphState'))
      const stateManager = graphStateManager.loadState('graph')
      
      const controls = {
        ...stateManager.controls,
        ...(localGraphState?.controls || {})
      }

      this.simulation = d3
        .forceSimulation(cleanedGraph.nodes)
        .force(
          'link',
          d3
            .forceLink(cleanedGraph.links)
            .id((d) => d.id)
            .distance(controls.linkDistance || 200)
        )
        .force(
          'charge',
          d3.forceManyBody().strength(controls.chargeStrength || -300)
        )
        .force('collide', d3.forceCollide(controls.collideRadius || 60))
        .force(
          'center',
          d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2)
        )
        .force('x', d3.forceX().strength(controls.forceStrength || 0.1))
        .force('y', d3.forceY().strength(controls.forceStrength || 0.1))
        .alphaDecay(0.05)
        .on('tick', () => {
          // Update graph state on each tick
          this.graph = { ...this.graph }
        })

      // Apply saved node positions if they exist
      if (localGraphState?.nodePositions) {
        cleanedGraph.nodes.forEach(node => {
          const savedPos = localGraphState.nodePositions[node.id]
          if (savedPos) {
            node.x = savedPos.x
            node.y = savedPos.y
            node.fx = savedPos.fx
            node.fy = savedPos.fy
          }
        })
      }
    },

    async fetchGraphBySubjectId(subjectID) {
      const subjectsStore = useSubjectsStore()
      const subject = subjectsStore.getSubjectByID(subjectID)
      if (subject) {
        const graphData = await db
          .collection('graphs')
          .doc(subject.graphID)
          .get()
        if (graphData.exists) {
          this.setGraph(graphData.data())
        } else {
          console.error('Graph data not found')
        }
      } else {
        console.error('Subject not found')
      }
    },
  },
})
