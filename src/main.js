import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import "@/assets/styles/chat-styles.css";

const app = createApp(App);

// Create and use Pinia
const pinia = createPinia();
app.use(pinia);

// Initialize stores after app creation
app.mount("#app");

// Load initial data after mount
const initializeStores = async () => {
  const { useCodeStore } = await import("@/stores/codeStore");
  const { useAIStore } = await import("@/stores/aiChatStore");

  const codeStore = useCodeStore();
  const aiStore = useAIStore();

  await Promise.all([codeStore.loadNodes(), aiStore.loadChatHistory()]);
};

initializeStores().catch((error) => {
  console.error("Failed to initialize stores:", error);
});
