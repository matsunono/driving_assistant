import type { Config } from './config'

export interface Project {
  id: string
  name: string
  description: string
  starred: boolean
  configs: Config[]
}