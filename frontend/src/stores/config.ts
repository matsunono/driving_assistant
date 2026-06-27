import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { useProjectStore } from './project'

export const useConfigStore = defineStore('config', () => {
  const projectStore = useProjectStore()
  const selectedConfigId = ref<string>('')

  const selectedConfig = computed(() => {
    const project = projectStore.selectedProject
    if (!project) {
      return null
    }

    return project.configs.find((config) => config.id === selectedConfigId.value) ?? project.configs[0] ?? null
  })

  function selectConfig(configId: string) {
    selectedConfigId.value = configId
  }

  return {
    selectedConfigId,
    selectedConfig,
    selectConfig,
  }
})