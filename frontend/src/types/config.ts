export type TimerType = 'timer' | 'alarm'
export type PlaybackMode = 'random' | 'sequential'

export interface TimerInterval {
  days: number
  hours: number
  minutes: number
}

export interface Config {
  id: string
  projectId: string
  name: string
  description: string
  timerType: TimerType
  interval: TimerInterval
  alarmTime?: string
  requireActionOnEnd: boolean
  targetPath: string
  playbackMode: PlaybackMode
  audioDucking: boolean
  enabled: boolean
}