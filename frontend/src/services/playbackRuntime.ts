import {
  PlaybackEngine,
  type PlaybackSnapshot,
  type StartPlaybackOptions,
} from './playbackEngine'
import { isAndroidPlatform, isNativePlatform } from '../plugins/capacitor'
import { NativePlayback } from '../plugins/nativePlayback'

type SnapshotListener = (snapshot: PlaybackSnapshot) => void

const engine = new PlaybackEngine()
const listeners = new Set<SnapshotListener>()
let runtimeOwnedUrls: string[] = []
let nativeListenerBound = false

let snapshot: PlaybackSnapshot = engine.getSnapshot()
let pollHandle: ReturnType<typeof setInterval> | null = null

function publish(nextSnapshot?: PlaybackSnapshot) {
  snapshot = nextSnapshot ?? engine.getSnapshot()
  for (const listener of listeners) {
    listener(snapshot)
  }
}

function hasNativeRuntime() {
  return isNativePlatform() && isAndroidPlatform()
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function toRuntimeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return fallback
}

async function bindNativeListener() {
  if (!hasNativeRuntime() || nativeListenerBound) {
    return
  }

  try {
    await NativePlayback.addListener('snapshotChanged', (next) => {
      publish(next)
    })
    nativeListenerBound = true
  } catch {
    nativeListenerBound = false
  }
}

function clearPolling() {
  if (!pollHandle) {
    return
  }

  clearInterval(pollHandle)
  pollHandle = null
}

function revokeRuntimeOwnedUrls() {
  for (const url of runtimeOwnedUrls) {
    URL.revokeObjectURL(url)
  }
  runtimeOwnedUrls = []
}

function ensurePolling() {
  if (pollHandle) {
    return
  }

  pollHandle = setInterval(() => {
    publish()
    if (!snapshot.running) {
      clearPolling()
    }
  }, 1000)
}

export function getRuntimeSnapshot() {
  return snapshot
}

export function subscribeRuntimeSnapshot(listener: SnapshotListener) {
  listeners.add(listener)
  listener(snapshot)
  void bindNativeListener()

  return () => {
    listeners.delete(listener)
  }
}

export async function startRuntime(options: StartPlaybackOptions) {
  if (hasNativeRuntime()) {
    try {
      await bindNativeListener()
      const accepted = await NativePlayback.start({
        configId: options.configId,
        configName: options.configName,
        timerType: options.timerType,
        intervalMinutes: options.intervalMinutes,
        alarmTime: options.alarmTime,
        playbackMode: options.playbackMode,
        queue: options.queue,
      })
      publish(accepted)

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const refreshed = await NativePlayback.getSnapshot()
        publish(refreshed)

        if (refreshed.running || refreshed.errorMessage) {
          break
        }

        await delay(120)
      }

      return snapshot
    } catch (error) {
      publish({
        running: false,
        configId: options.configId,
        configName: options.configName,
        timerType: options.timerType,
        queueSize: options.queue.length,
        nextRunAt: null,
        lastRunAt: snapshot.lastRunAt,
        lastPlayedLabel: snapshot.lastPlayedLabel,
        errorMessage: toRuntimeErrorMessage(error, 'ネイティブ再生の開始に失敗しました'),
      })
      return snapshot
    }
  }

  revokeRuntimeOwnedUrls()
  runtimeOwnedUrls = options.queue
    .map((item) => item.url)
    .filter((url): url is string => Boolean(url))

  const next = await engine.start(options)
  publish(next)

  if (next.running) {
    ensurePolling()
  } else {
    clearPolling()
    revokeRuntimeOwnedUrls()
  }

  return snapshot
}

export async function triggerRuntimeNow() {
  if (hasNativeRuntime()) {
    try {
      const next = await NativePlayback.triggerNow()
      publish(next)
    } catch (error) {
      publish({
        ...snapshot,
        errorMessage: toRuntimeErrorMessage(error, 'ネイティブ即時再生に失敗しました'),
      })
    }
    return snapshot
  }

  const next = await engine.triggerNow()
  publish(next)
  return snapshot
}

export function stopRuntime() {
  if (hasNativeRuntime()) {
    void NativePlayback.stop().then((next) => {
      publish(next)
    })
    snapshot = {
      ...snapshot,
      running: false,
      nextRunAt: null,
    }
    publish(snapshot)
    return snapshot
  }

  const next = engine.stop()
  clearPolling()
  revokeRuntimeOwnedUrls()
  publish(next)
  return snapshot
}

export async function hydrateRuntimeSnapshot() {
  if (!hasNativeRuntime()) {
    return snapshot
  }

  await bindNativeListener()

  try {
    const next = await NativePlayback.getSnapshot()
    publish(next)
  } catch {
    // Keep the last in-memory snapshot when native bridge is not ready.
  }

  return snapshot
}
