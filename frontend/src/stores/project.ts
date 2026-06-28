import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { Config } from '../types/config'
import type { Project } from '../types/project'
import { exportProjectsSnapshot, loadProjectsFromJson, saveProjectsToJson } from '../services/projectPersistence'

const createId = () => Math.random().toString(36).slice(2, 10)

const createConfig = (projectId: string, overrides: Partial<Config> = {}): Config => ({
  id: createId(),
  projectId,
  name: '設定ファイル1',
  description: '30分ごとに休憩音声を再生します',
  timerType: 'timer',
  interval: { days: 0, hours: 0, minutes: 30 },
  alarmTime: undefined,
  requireActionOnEnd: false,
  targetPath: '/storage/emulated/0/Music/rest',
  playbackMode: 'random',
  audioDucking: true,
  enabled: true,
  ...overrides,
})

const initialProjects: Project[] = [
  {
    id: 'drive',
    name: 'ドライブ用ヌヌちゃん',
    description: '運転中に休憩や注意喚起を届ける設定集',
    starred: true,
    enabled: true,
    configs: [
      createConfig('drive', {
        id: 'drive-rest',
        name: '休憩リマインド',
        description: '30分ごとに休憩を促す',
        interval: { days: 0, hours: 0, minutes: 30 },
        targetPath: '/storage/emulated/0/Music/drive/rest',
      }),
      createConfig('drive', {
        id: 'drive-focus',
        name: '安全運転メッセージ',
        description: '長距離走行時に安全確認を促す',
        interval: { days: 0, hours: 1, minutes: 0 },
        targetPath: '/storage/emulated/0/Music/drive/safety',
      }),
    ],
  },
  {
    id: 'work',
    name: 'ポモドーロBGM',
    description: '作業と休憩を切り替えるタイマー設定',
    starred: false,
    enabled: false,
    configs: [
      createConfig('work', {
        id: 'work-break',
        name: '25分作業 → 休憩',
        description: 'ポモドーロ終了時に短い音声を再生',
        interval: { days: 0, hours: 0, minutes: 25 },
        playbackMode: 'sequential',
      }),
    ],
  },
]

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>(initialProjects)
  const selectedProjectId = ref<string>(initialProjects[0]?.id ?? '')

  const starredProjects = computed(() => projects.value.filter((project) => project.starred))
  const selectedProject = computed(
    () => projects.value.find((project) => project.id === selectedProjectId.value) ?? null,
  )

  function persistProjects() {
    return saveProjectsToJson(projects.value)
  }

  function queuePersistProjects() {
    void persistProjects()
  }

  async function hydrateProjects() {
    const persisted = await loadProjectsFromJson()
    if (!persisted || persisted.length === 0) {
      return
    }

    projects.value = persisted
    selectedProjectId.value = persisted[0]?.id ?? ''
  }

  function exportProjectsJson() {
    return exportProjectsSnapshot(projects.value)
  }

  function selectProject(projectId: string) {
    selectedProjectId.value = projectId
  }

  function createProject(name: string, description = '') {
    const project: Project = {
      id: createId(),
      name,
      description,
      starred: false,
      enabled: false,
      configs: [],
    }

    projects.value.unshift(project)
    selectedProjectId.value = project.id
    queuePersistProjects()
    return project
  }

  function updateProject(projectId: string, patch: Partial<Pick<Project, 'name' | 'description' | 'starred'>>) {
    const project = projects.value.find((item) => item.id === projectId)
    if (!project) {
      return
    }

    Object.assign(project, patch)
    queuePersistProjects()
  }

  function removeProject(projectId: string) {
    projects.value = projects.value.filter((project) => project.id !== projectId)

    if (selectedProjectId.value === projectId) {
      selectedProjectId.value = projects.value[0]?.id ?? ''
    }

    queuePersistProjects()
  }

  function toggleProjectStar(projectId: string) {
    const project = projects.value.find((item) => item.id === projectId)
    if (project) {
      project.starred = !project.starred
      queuePersistProjects()
    }
  }

  function toggleProjectEnabled(projectId: string) {
    const project = projects.value.find((item) => item.id === projectId)
    if (project) {
      project.enabled = !project.enabled
      queuePersistProjects()
    }
  }

  function createConfigForProject(projectId: string, name: string) {
    const project = projects.value.find((item) => item.id === projectId)
    if (!project) {
      return null
    }

    const config = createConfig(projectId, { name })
    project.configs.unshift(config)
    queuePersistProjects()
    return config
  }

  function updateConfig(projectId: string, configId: string, patch: Partial<Config>) {
    const project = projects.value.find((item) => item.id === projectId)
    const config = project?.configs.find((item) => item.id === configId)

    if (config) {
      Object.assign(config, patch)
      queuePersistProjects()
    }
  }

  function toggleConfigEnabled(projectId: string, configId: string) {
    const project = projects.value.find((item) => item.id === projectId)
    const config = project?.configs.find((item) => item.id === configId)

    if (config) {
      config.enabled = !config.enabled
      queuePersistProjects()
    }
  }

  function removeConfig(projectId: string, configId: string) {
    const project = projects.value.find((item) => item.id === projectId)
    if (!project) {
      return
    }

    project.configs = project.configs.filter((config) => config.id !== configId)
    queuePersistProjects()
  }

  return {
    projects,
    selectedProjectId,
    selectedProject,
    starredProjects,
    selectProject,
    createProject,
    updateProject,
    removeProject,
    toggleProjectStar,
    toggleProjectEnabled,
    createConfigForProject,
    updateConfig,
    toggleConfigEnabled,
    removeConfig,
    persistProjects,
    hydrateProjects,
    exportProjectsJson,
  }
})