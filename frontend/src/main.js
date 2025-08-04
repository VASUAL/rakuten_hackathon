// frontend/src/main.js

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// --- 新增代码 START ---
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css' // 引入Element Plus的CSS样式文件
// --- 新增代码 END ---

const app = createApp(App)

app.use(ElementPlus) // <-- 新增：在整个应用中启用Element Plus
app.use(router)

app.mount('#app')