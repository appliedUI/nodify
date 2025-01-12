import { Dexie } from 'dexie'

export class SubjectModel {
  id // Auto-incremented ID
  name
  workspaceId
  createdAt
  graph
  graphState // Add graphState to the subject model
  transcript // New field
  markdownTranscript // Add new field for markdown version
  youtubeUrl // Add new field

  constructor({
    name,
    workspaceId,
    createdAt,
    graph,
    graphState,
    transcript,
    markdownTranscript,
    youtubeUrl,
  }) {
    this.name = name
    this.workspaceId = workspaceId
    this.createdAt = createdAt || new Date()
    this.graph = graph || {}
    this.graphState = graphState || {
      transform: { x: 0, y: 0, k: 1 },
      openPanels: [],
      selectedNodeId: null,
      nodePositions: {},
      controls: {
        linkDistance: 300,
        chargeStrength: 0,
        edgeCurvature: 0,
        collideRadius: 60,
      },
    }
    this.transcript = transcript || '' // Initialize as empty string instead of null
    this.markdownTranscript = markdownTranscript || '' // Initialize markdown transcript
    this.youtubeUrl = youtubeUrl || '' // Initialize as empty string
  }

  static get schema() {
    // Return schema as a string instead of an object
    return '++id, name, workspaceId, createdAt, graph, graphState, transcript, markdownTranscript, youtubeUrl'
  }
}
