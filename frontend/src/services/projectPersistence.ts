import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

import type { Project } from '../types/project'

const PROJECTS_FILE_PATH = 'soundup/projects.json'
const PROJECTS_FALLBACK_KEY = 'soundup.projects.json'

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
    version: 1,
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

function parsePayload(raw: string): Project[] | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedProjectPayload>
    if (!Array.isArray(parsed.projects)) {
      return null
    }
    return parsed.projects as Project[]
  } catch {
    return null
  }
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
  try {
    const result = await Filesystem.readFile({
      path: PROJECTS_FILE_PATH,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })

    const text = typeof result.data === 'string' ? result.data : ''
    const projects = parsePayload(text)
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

  return parsePayload(fallback)
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
