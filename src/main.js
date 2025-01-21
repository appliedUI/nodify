import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
import "@/assets/styles/chat-styles.css";

const app = createApp(App);

// Create and use Pinia
const pinia = createPinia();
app.use(pinia);

app.mount("#app");
