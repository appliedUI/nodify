import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Changed from './routes' to './router'
import { createPinia } from 'pinia'
import './assets/styles/style.css'
import 'vue3-toastify/dist/index.css'
import './utils/polyfills'

const pinia = createPinia()
const app = createApp(App)

app.use(router)
app.use(pinia)

app.mount('#app')
