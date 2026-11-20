import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import './styles/index.css'
/* 液态玻璃设计层：必须排在 Element Plus 之后，才能接管组件外观 */
import './styles/liquid-glass.css'
/* 标题字体（@font-face + --font-display / --font-grotesk 变量） */
import './styles/fonts.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
