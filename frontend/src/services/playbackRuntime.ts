import {
  PlaybackEngine,
  type PlaybackSnapshot,
  type StartPlaybackOptions,
} from './playbackEngine'

type SnapshotListener = (snapshot: PlaybackSnapshot) => void

const engine = new PlaybackEngine()
const listeners = new Set<SnapshotListener>()
let runtimeOwnedUrls: string[] = []

let snapshot: PlaybackSnapshot = engine.getSnapshot()
let pollHandle: ReturnType<typeof setInterval> | null = null

function publish(nextSnapshot?: PlaybackSnapshot) {
  snapshot = nextSnapshot ?? engine.getSnapshot()
  for (const listener of listeners) {
    listener(snapshot)
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

  return () => {
    listeners.delete(listener)
  }
}

export async function startRuntime(options: StartPlaybackOptions) {
  revokeRuntimeOwnedUrls()
  runtimeOwnedUrls = options.queue.map((item) => item.url)

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
  const next = await engine.triggerNow()
  publish(next)
  return snapshot
}

export function stopRuntime() {
  const next = engine.stop()
  clearPolling()
  revokeRuntimeOwnedUrls()
  publish(next)
  return snapshot
}
