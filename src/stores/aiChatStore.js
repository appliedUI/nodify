import { defineStore } from "pinia";
import {
  sendAgentMessage,
  reviewCodeSnippet,
  sendFollowUpMessage,
  updateCompiledCode,
} from "../services/aiChat";

export const useAIStore = defineStore("ai", {
  state: () => ({
    chatHistory: [],
    isLoading: false,
    error: null,
    currentMessage: "",
    isTyping: false,
    agentConfig: {}, // Empty object since we'll use snippet-specific configs
  }),

  getters: {
    getChatHistory: (state) => state.chatHistory,
    getLastMessage: (state) => state.chatHistory[state.chatHistory.length - 1],
    isChatting: (state) => state.isLoading,
    getLatestCode: (state) => {
      const lastAssistantMessage = state.chatHistory
        .filter(
          (msg) => msg.role === "assistant" && typeof msg.content === "object"
        )
        .pop();
      return lastAssistantMessage?.content?.code || "";
    },
  },

  actions: {
    async sendMessage(message) {
      if (!message.trim()) return;

      console.log("[STORE] Preparing to send message:", message);
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
        console.log("[STORE] Sending message to AI service...");
        const response = await sendAgentMessage(this.agentConfig, message);
        console.log("[STORE] Received AI response:", response);

        // Add AI response to chat history as markdown content
        this.chatHistory.push({
          role: "assistant",
          content: response.response, // Store raw markdown content
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[STORE] Error in sendMessage:", error);
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

    async sendCodeReview(snippet) {
      console.log(
        "[STORE] Starting code review for:",
        snippet?.label || "unnamed snippet"
      );
      this.isLoading = true;
      this.error = null;

      try {
        const config = snippet?.agentConfig || {
          model: "gpt-4o-mini",
          temperature: 0.7,
          maxTokens: 1000,
          topP: 1.0,
        };

        console.log("[STORE] Sending code review request with config:", config);
        const response = await reviewCodeSnippet(config, snippet);
        console.log("[STORE] Received code review response:", response);

        // Parse the JSON response string
        let parsedContent;
        try {
          if (typeof response.response === "string") {
            parsedContent = JSON.parse(response.response.replace(/\n/g, ""));
          } else {
            parsedContent = response.response;
          }
        } catch (e) {
          console.warn("[STORE] Failed to parse JSON response:", e);
          parsedContent = {
            message: response.response,
            type: "error",
            details: ["Failed to parse response format"],
          };
        }

        // Add AI response to chat history with parsed content
        this.chatHistory.push({
          role: "assistant",
          content: parsedContent,
          timestamp: new Date().toISOString(),
        });

        return response;
      } catch (error) {
        console.error("[STORE] Error in sendCodeReview:", error);
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async handleCompileSubmit(payload) {
      try {
        const response = await updateCompiledCode(payload);
        console.log("[STORE] Received response from AI service:", response);
        
        // Add the interaction to chat history
        this.chatHistory.push({
          role: "assistant",
          content: {
            message: "Code updated based on form submission",
            type: "success",
            details: [],
            code: response.code
          },
          timestamp: new Date().toISOString(),
        });

        return response;
      } catch (error) {
        console.error("[STORE] Error handling compile submission:", error);
        throw error;
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
