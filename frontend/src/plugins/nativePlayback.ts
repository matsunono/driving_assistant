import { registerPlugin } from '@capacitor/core'

import type { PlaybackSnapshot, PlaybackQueueItem } from '../services/playbackEngine'
import type { PlaybackMode, TimerType } from '../types/config'

export interface NativeStartOptions {
  configId: string
  configName: string
  timerType: TimerType
  intervalMinutes: number
  alarmTime?: string
  playbackMode: PlaybackMode
  queue: PlaybackQueueItem[]
}

export interface NativePlaybackPlugin {
  start(options: NativeStartOptions): Promise<PlaybackSnapshot>
  stop(): Promise<PlaybackSnapshot>
  triggerNow(): Promise<PlaybackSnapshot>
  getSnapshot(): Promise<PlaybackSnapshot>
  addListener(
    eventName: 'snapshotChanged',
    listenerFunc: (event: PlaybackSnapshot) => void,
  ): Promise<{ remove: () => Promise<void> }>
}

export const NativePlayback = registerPlugin<NativePlaybackPlugin>('NativePlayback')
