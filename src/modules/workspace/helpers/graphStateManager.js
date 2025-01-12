const STORAGE_KEY = 'graph_state_v1'

export const graphStateManager = {
  saveState(graphType, state) {
    try {
      const savedStates = this.getAllStates()
      savedStates[graphType] = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedStates))
    } catch (error) {
      console.warn('Failed to save graph state:', error)
    }
  },

  loadState(graphType) {
    try {
      const savedStates = this.getAllStates()
      return savedStates[graphType] || this.getDefaultState()
    } catch (error) {
      console.warn('Failed to load graph state:', error)
      return this.getDefaultState()
    }
  },

  getAllStates() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    } catch {
      return {}
    }
  },

  getDefaultState() {
    return {
      transform: { x: 0, y: 0, k: 1 },
      openPanels: [],
      selectedNodeId: null,
      nodePositions: {},
      controls: {
        edgeLength: 200,
        nodeSeparation: 100,
        linkDistance: 230,
        chargeStrength: -500,
        edgeCurvature: 0,
        collideRadius: 60,
        forceStrength: 0.1,
      },
    }
  },

  clearState() {
    localStorage.removeItem(STORAGE_KEY)
  },
}
