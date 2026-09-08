import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/global.css'
import { demoItems } from './data/demo-items.js'

const app = createApp(App, {
  initialItems: demoItems,
})

app.use(createPinia())
app.mount('#app')
