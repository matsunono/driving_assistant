import type { Config } from './config'

export interface Project {
  id: string
  name: string
  description: string
  starred: boolean
  enabled: boolean
  configs: Config[]
}