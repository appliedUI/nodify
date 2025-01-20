import { defineStore } from "pinia";
import {
  sendAgentMessage,
  reviewCodeSnippet,
  sendFollowUpMessage,
} from "../services/aiChat";

export const useAIStore = defineStore("ai", {
  state: () => ({
    chatHistory: [],
    isLoading: false,
    error: null,
    agentConfig: {
      id: "chat-agent",
      name: "AI Assistant",
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0,
    },
    currentMessage: "",
    isTyping: false,
  }),

  getters: {
    getChatHistory: (state) => state.chatHistory,
    getLastMessage: (state) => state.chatHistory[state.chatHistory.length - 1],
    isChatting: (state) => state.isLoading,
  },

  actions: {
    async sendMessage(message) {
      if (!message.trim()) return;

      this.isLoading = true;
      this.error = null;
      this.currentMessage = "";

      // Add user message to chat history
      this.chatHistory.push({
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });

      try {
        // Send message to AI
        const response = await sendAgentMessage(this.agentConfig, message);

        // Add AI response to chat history
        this.chatHistory.push({
          ...response,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.error = error.message || "Failed to send message";
        // Add error message to chat history
        this.chatHistory.push({
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
          isError: true,
        });
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async sendCodeReview(nodeData) {
      this.isLoading = true;
      this.error = null;

      try {
        // Send code for review
        const response = await reviewCodeSnippet(this.agentConfig, {
          type: nodeData.type,
          label: nodeData.label,
          description: nodeData.description,
          code: nodeData.code,
          agentPrompt: nodeData.agentPrompt
        });

        // Add AI response to chat history
        this.chatHistory.push({
          role: "assistant",
          content: response.response,
          timestamp: new Date().toISOString(),
        });

        return response;
      } catch (error) {
        console.error("Error in AI chat:", error);
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    clearChat() {
      this.chatHistory = [];
      this.error = null;
    },

    updateCurrentMessage(message) {
      this.currentMessage = message;
    },

    setTypingStatus(isTyping) {
      this.isTyping = isTyping;
    },
  },
});
