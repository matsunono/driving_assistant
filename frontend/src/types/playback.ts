export type PlaybackState = 'idle' | 'queued' | 'playing' | 'error'

export interface PlaybackHistoryItem {
  id: string
  projectId: string
  configId: string
  title: string
  playedAt: string
  result: 'success' | 'skipped' | 'failed'
}

export interface PlaybackQueueItem {
  id: string
  projectId: string
  configId: string
  label: string
}