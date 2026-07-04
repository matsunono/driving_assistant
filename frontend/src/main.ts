import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { useTheme } from './composable/useTheme'
import router from './router'
import { useProjectStore } from './stores/project'

async function bootstrap() {
  const { initTheme } = useTheme()
  initTheme()

	const app = createApp(App)
	const pinia = createPinia()

	app.use(pinia)

	const projectStore = useProjectStore(pinia)
	await projectStore.hydrateProjects()

	app.use(router)
	app.mount('#app')
}

void bootstrap()
