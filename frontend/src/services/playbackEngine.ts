import type { PlaybackMode, TimerType } from '../types/config'

export interface PlaybackQueueItem {
  id: string
  label: string
  url?: string
  sourcePath?: string
}

export interface PlayedEvent {
  label: string
  result: 'success' | 'failed'
}

export interface StartPlaybackOptions {
  configId: string
  configName: string
  timerType: TimerType
  intervalMinutes: number
  alarmTime?: string
  playbackMode: PlaybackMode
  queue: PlaybackQueueItem[]
  onPlayed?: (event: PlayedEvent) => void
}

export interface PlaybackSnapshot {
  running: boolean
  configId: string | null
  configName: string | null
  timerType: TimerType | null
  queueSize: number
  nextRunAt: string | null
  lastRunAt: string | null
  lastPlayedLabel: string | null
  errorMessage: string | null
}

// Minimal 1-frame silent WAV to unlock autoplay without audible sound.
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

export class PlaybackEngine {
  private audio: HTMLAudioElement | null = null
  private audioUnlocked = false
  private intervalHandle: ReturnType<typeof setInterval> | null = null
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null
  private options: StartPlaybackOptions | null = null
  private nextIndex = 0
  private lastRandomIndex = -1
  private snapshot: PlaybackSnapshot = {
    running: false,
    configId: null,
    configName: null,
    timerType: null,
    queueSize: 0,
    nextRunAt: null,
    lastRunAt: null,
    lastPlayedLabel: null,
    errorMessage: null,
  }

  getSnapshot() {
    return { ...this.snapshot }
  }

  private ensureAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio()
      this.audio.preload = 'auto'
    }
    return this.audio
  }

  // Must be called during a user gesture to unlock autoplay on Android WebView.
  async unlockAudio(warmupUrl?: string): Promise<boolean> {
    if (this.audioUnlocked) {
      return true
    }

    const audio = this.ensureAudio()
    audio.src = warmupUrl ?? SILENT_WAV
    audio.muted = true

    try {
      await audio.play()
      audio.pause()
      audio.currentTime = 0
      audio.muted = false
      this.audioUnlocked = true
      return true
    } catch {
      audio.muted = false
      // Unlock failed — autoplay may still be blocked.
      return false
    }
  }

  async start(options: StartPlaybackOptions) {
    this.stop()
    this.options = options
    this.nextIndex = 0
    this.lastRandomIndex = -1

    this.snapshot = {
      running: true,
      configId: options.configId,
      configName: options.configName,
      timerType: options.timerType,
      queueSize: options.queue.length,
      nextRunAt: null,
      lastRunAt: null,
      lastPlayedLabel: null,
      errorMessage: null,
    }

    const canUnlock = await this.unlockAudio(options.queue[0]?.url)
    if (!canUnlock) {
      this.snapshot.running = false
      this.snapshot.errorMessage = '再生準備に失敗しました（画面を一度タップしてから再試行してください）'
      return this.getSnapshot()
    }

    if (options.timerType === 'timer') {
      this.startTimerMode(options)
      return this.getSnapshot()
    }

    this.startAlarmMode(options)
    return this.getSnapshot()
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = null
    }

    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }

    this.options = null
    this.snapshot.running = false
    this.snapshot.nextRunAt = null
    this.snapshot.errorMessage = null
    return this.getSnapshot()
  }

  async triggerNow() {
    if (!this.options) {
      this.snapshot.errorMessage = '再生設定が開始されていません'
      return this.getSnapshot()
    }

    if (this.options.queue.length === 0) {
      this.snapshot.errorMessage = '再生対象の音声がありません'
      return this.getSnapshot()
    }

    const item = this.pickNextItem(this.options.queue, this.options.playbackMode)
    if (!item) {
      this.snapshot.errorMessage = '再生対象の音声がありません'
      return this.getSnapshot()
    }

    if (!this.audio) {
      this.audio = new Audio()
    }

    const audio = this.audio
    const playbackUrl = item.url ?? item.sourcePath

    if (!playbackUrl) {
      this.snapshot.errorMessage = '再生対象の音声がありません'
      this.options?.onPlayed?.({ label: item.label, result: 'failed' })
      return this.getSnapshot()
    }

    audio.src = playbackUrl

    try {
      await audio.play()
      this.snapshot.lastRunAt = new Date().toISOString()
      this.snapshot.lastPlayedLabel = item.label
      this.snapshot.errorMessage = null
      this.options?.onPlayed?.({ label: item.label, result: 'success' })
    } catch (err) {
      const isAutoplayBlocked =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'AbortError')
      this.snapshot.errorMessage = isAutoplayBlocked
        ? '再生がブロックされました（画面を一度操作してから再試行してください）'
        : '音声再生に失敗しました'
      this.options?.onPlayed?.({ label: item.label, result: 'failed' })
    }

    return this.getSnapshot()
  }

  private startTimerMode(options: StartPlaybackOptions) {
    const minutes = Math.max(1, Math.trunc(options.intervalMinutes))
    const delayMs = minutes * 60 * 1000

    this.snapshot.nextRunAt = new Date(Date.now() + delayMs).toISOString()

    this.intervalHandle = setInterval(() => {
      void this.triggerNow().then(() => {
        this.snapshot.nextRunAt = new Date(Date.now() + delayMs).toISOString()
      })
    }, delayMs)
  }

  private startAlarmMode(options: StartPlaybackOptions) {
    if (!options.alarmTime) {
      this.snapshot.errorMessage = 'アラーム時刻が設定されていません'
      this.snapshot.running = false
      return
    }

    const nextAt = this.computeNextAlarm(options.alarmTime)
    if (!nextAt) {
      this.snapshot.errorMessage = 'アラーム時刻の形式が不正です'
      this.snapshot.running = false
      return
    }

    this.scheduleAlarm(nextAt)
  }

  private scheduleAlarm(runAt: Date) {
    const delay = Math.max(0, runAt.getTime() - Date.now())
    this.snapshot.nextRunAt = runAt.toISOString()

    this.timeoutHandle = setTimeout(() => {
      void this.triggerNow().then(() => {
        // First implementation: repeat daily at the same local time.
        const next = new Date(runAt)
        next.setDate(next.getDate() + 1)
        this.scheduleAlarm(next)
      })
    }, delay)
  }

  private computeNextAlarm(isoLike: string) {
    const target = new Date(isoLike)
    if (Number.isNaN(target.getTime())) {
      return null
    }

    if (target.getTime() > Date.now()) {
      return target
    }

    const next = new Date(target)
    next.setDate(next.getDate() + 1)
    return next
  }

  private pickNextItem(queue: PlaybackQueueItem[], mode: PlaybackMode) {
    if (queue.length === 0) {
      return null
    }

    if (mode === 'random') {
      let index = Math.floor(Math.random() * queue.length)
      if (queue.length > 1 && index === this.lastRandomIndex) {
        index = (index + 1) % queue.length
      }
      this.lastRandomIndex = index
      return queue[index] ?? queue[0]
    }

    const item = queue[this.nextIndex % queue.length] ?? queue[0]
    this.nextIndex = (this.nextIndex + 1) % queue.length
    return item
  }
}
