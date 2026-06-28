import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

import type { Project } from '../types/project'

const PROJECTS_FILE_PATH = 'soundup/projects.json'
const PROJECTS_FALLBACK_KEY = 'soundup.projects.json'

interface PersistedProjectPayload {
  version: number
  updatedAt: string
  projects: Project[]
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
