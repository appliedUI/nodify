import Dexie from "dexie";

// Initialize Dexie database
const db = new Dexie("FlowEditorDB");
db.version(2)
  .stores({
    nodes:
      "++id, type, label, code, agentPrompt, position, parentNode, description, agentConfig",
    nodeTypes: "id, type, label, code, description, agentPrompt, agentConfig",
    chatHistory: "++id, role, content, timestamp",
    settings: "++id, key, value",
    viewport: "++id, x, y, zoom",
  })
  .upgrade((trans) => {
    // Migration logic if needed
  });

// Export database operations
export const dbService = {
  // Node operations
  async saveNode(node) {
    // Ensure we're saving a plain object
    const plainNode = {
      id: node.id,
      type: node.type,
      label: node.label,
      code: node.code,
      agentPrompt: node.agentPrompt,
      position: node.position,
      description: node.description,
      agentConfig: node.agentConfig,
    };
    return db.nodes.put(plainNode);
  },

  async getNodes() {
    return db.nodes.toArray();
  },

  async deleteNode(id) {
    return db.nodes.delete(id);
  },

  // Node Type operations
  async saveNodeType(nodeType) {
    return db.nodeTypes.put(nodeType);
  },

  async getNodeTypes() {
    return db.nodeTypes.toArray();
  },

  // Chat History operations
  async saveChatMessage(message) {
    return db.chatHistory.put(message);
  },

  async getChatHistory() {
    return db.chatHistory.toArray();
  },

  // Settings operations
  async saveSetting(key, value) {
    return db.settings.put({ key, value });
  },

  async getSetting(key) {
    const setting = await db.settings.get({ key });
    return setting?.value;
  },

  // Viewport operations
  async saveViewport(viewport) {
    return db.viewport.put({
      id: 1, // We'll use a single record with id=1 for viewport
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom,
    });
  },

  async getViewport() {
    return db.viewport.get(1);
  },
};
