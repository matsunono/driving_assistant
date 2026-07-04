import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

import type { Config } from '../types/config'
import type { Project } from '../types/project'

const PROJECTS_FILE_PATH = 'soundup/projects.json'
const PROJECTS_FALLBACK_KEY = 'soundup.projects.json'
const CURRENT_SCHEMA_VERSION = 2

interface PersistedProjectPayload {
  version: number
  updatedAt: string
  projects: Project[]
}

export interface ExportResult {
  mode: 'native' | 'browser'
  fileName: string
  path?: string
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function buildPayload(projects: Project[]): PersistedProjectPayload {
  return {
    version: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    projects,
  }
}

function buildFileName() {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const sec = String(now.getSeconds()).padStart(2, '0')
  return `projects-${yyyy}${mm}${dd}-${hh}${min}${sec}.json`
}

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toSafeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function toSafeBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return fallback
}

function sanitizeConfig(rawConfig: unknown, projectId: string, index: number): Config {
  const config = isRecord(rawConfig) ? rawConfig : {}
  const rawInterval = isRecord(config.interval) ? config.interval : {}
  const timerType = config.timerType === 'alarm' ? 'alarm' : 'timer'
  const playbackMode = config.playbackMode === 'sequential' ? 'sequential' : 'random'

  return {
    id: toSafeString(config.id, `${projectId}-cfg-${index}-${createId()}`),
    projectId,
    name: toSafeString(config.name, `設定ファイル${index + 1}`),
    description: toSafeString(config.description),
    timerType,
    interval: {
      days: Math.max(0, Math.trunc(toSafeNumber(rawInterval.days, 0))),
      hours: Math.max(0, Math.trunc(toSafeNumber(rawInterval.hours, 0))),
      minutes: Math.max(0, Math.trunc(toSafeNumber(rawInterval.minutes, 30))),
    },
    alarmTime: typeof config.alarmTime === 'string' ? config.alarmTime : undefined,
    requireActionOnEnd: toSafeBoolean(config.requireActionOnEnd, false),
    targetPath: toSafeString(config.targetPath),
    playbackMode,
    audioDucking: toSafeBoolean(config.audioDucking, true),
    enabled: toSafeBoolean(config.enabled, true),
  }
}

function sanitizeProjects(rawProjects: unknown): Project[] | null {
  if (!Array.isArray(rawProjects)) {
    return null
  }

  const projects = rawProjects
    .map((rawProject, index) => {
      if (!isRecord(rawProject)) {
        return null
      }

      const projectId = toSafeString(rawProject.id, `project-${index}-${createId()}`)
      const rawConfigs = Array.isArray(rawProject.configs) ? rawProject.configs : []

      return {
        id: projectId,
        name: toSafeString(rawProject.name, `プロジェクト${index + 1}`),
        description: toSafeString(rawProject.description),
        starred: toSafeBoolean(rawProject.starred, false),
        enabled: toSafeBoolean(rawProject.enabled, true),
        configs: rawConfigs.map((config, configIndex) => sanitizeConfig(config, projectId, configIndex)),
      } satisfies Project
    })
    .filter((project): project is Project => Boolean(project))

  return projects.length > 0 ? projects : null
}

function migratePayload(parsed: unknown): Project[] | null {
  if (Array.isArray(parsed)) {
    return sanitizeProjects(parsed)
  }

  if (!isRecord(parsed)) {
    return null
  }

  if (Array.isArray(parsed.projects)) {
    const version = toSafeNumber(parsed.version, 1)
    if (version <= CURRENT_SCHEMA_VERSION) {
      return sanitizeProjects(parsed.projects)
    }
  }

  return null
}

function parsePayload(raw: string): Project[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    return migratePayload(parsed)
  } catch {
    return null
  }
}

async function readPrimaryPayloadText() {
  const result = await Filesystem.readFile({
    path: PROJECTS_FILE_PATH,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  })

  return typeof result.data === 'string' ? result.data : ''
}

export async function saveProjectsToJson(projects: Project[]) {
  const payload = JSON.stringify(buildPayload(projects), null, 2)

  await Filesystem.writeFile({
    path: PROJECTS_FILE_PATH,
    data: payload,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  })

  if (hasLocalStorage()) {
    window.localStorage.setItem(PROJECTS_FALLBACK_KEY, payload)
  }
}

export async function loadProjectsFromJson() {
  let primaryRaw = ''

  try {
    primaryRaw = await readPrimaryPayloadText()
    const projects = parsePayload(primaryRaw)
    if (projects) {
      return projects
    }
  } catch {
    // fall through to localStorage fallback
  }

  if (!hasLocalStorage()) {
    return null
  }

  const fallback = window.localStorage.getItem(PROJECTS_FALLBACK_KEY)
  if (!fallback) {
    return null
  }

  const fallbackProjects = parsePayload(fallback)
  if (!fallbackProjects) {
    if (primaryRaw) {
      window.localStorage.removeItem(PROJECTS_FALLBACK_KEY)
    }
    return null
  }

  if (primaryRaw && !parsePayload(primaryRaw)) {
    await saveProjectsToJson(fallbackProjects)
  }

  return fallbackProjects
}

export async function exportProjectsSnapshot(projects: Project[]): Promise<ExportResult> {
  const payload = JSON.stringify(buildPayload(projects), null, 2)
  const fileName = buildFileName()

  if (Capacitor.isNativePlatform()) {
    const path = `soundup/export/${fileName}`

    await Filesystem.writeFile({
      path,
      data: payload,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })

    const uri = await Filesystem.getUri({ path, directory: Directory.Documents })
    return { mode: 'native', fileName, path: uri.uri }
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('ブラウザ環境での書き出しに失敗しました')
  }

  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)

  return { mode: 'browser', fileName }
}
