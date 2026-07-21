import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/base.css'
import App from './App.vue'
import router from './router'

window.addEventListener('auth-expired', () => {
  if (router.currentRoute.value.path !== '/login') router.replace('/login')
})

createApp(App).use(router).use(ElementPlus).mount('#app')
