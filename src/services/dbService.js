import Dexie from "dexie";

// Initialize Dexie database
const db = new Dexie("FlowEditorDB");
db.version(1).stores({
  nodes: "++id, type, label, code, agentPrompt, position, parentNode",
  nodeTypes: "id, type, label, code, description, agentPrompt, agentConfig",
  chatHistory: "++id, role, content, timestamp",
  settings: "++id, key, value",
});

// Export database operations
export const dbService = {
  // Node operations
  async saveNode(node) {
    return db.nodes.put(node);
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
};
