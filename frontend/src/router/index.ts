import { createRouter, createWebHistory } from 'vue-router'

import ConfigDetailView from '../views/ConfigDetailView.vue'
import HomeView from '../views/HomeView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'
import ProjectListView from '../views/ProjectListView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { 
      path: '/',
      name: 'home',
      component: HomeView
    },
    { 
      path: '/projects',
      name: 'projects',
      component: ProjectListView
    },
    { 
      path: '/projects/:projectId',
      name: 'project-detail',
      component: ProjectDetailView,
      props: true
    },
    {
      path: '/projects/:projectId/configs/:configId',
      name: 'config-detail',
      component: ConfigDetailView,
      props: true,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    },
  ],
})


export default router
