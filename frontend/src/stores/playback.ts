import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { PlaybackHistoryItem, PlaybackQueueItem, PlaybackState } from '../types/playback'

const createId = () => Math.random().toString(36).slice(2, 10)

export const usePlaybackStore = defineStore('playback', () => {
  const state = ref<PlaybackState>('idle')
  const queue = ref<PlaybackQueueItem[]>([])
  const history = ref<PlaybackHistoryItem[]>([
    {
      id: 'history-1',
      projectId: 'drive',
      configId: 'drive-rest',
      title: '休憩リマインド',
      playedAt: '2026-06-27T09:10:00+09:00',
      result: 'success',
    },
  ])

  const activeCount = computed(() => queue.value.length)
  const latestHistory = computed(() => history.value.slice(0, 8))

  function enqueue(item: Omit<PlaybackQueueItem, 'id'>) {
    queue.value.push({ ...item, id: createId() })
    state.value = 'queued'
  }

  function dequeue() {
    const item = queue.value.shift() ?? null
    if (queue.value.length === 0 && state.value === 'queued') {
      state.value = 'idle'
    }

    return item
  }

  function startPlaying() {
    state.value = 'playing'
  }

  function finishPlaying(entry: Omit<PlaybackHistoryItem, 'id' | 'playedAt'> & { playedAt?: string }) {
    history.value.unshift({
      id: createId(),
      playedAt: entry.playedAt ?? new Date().toISOString(),
      ...entry,
    })
    state.value = queue.value.length > 0 ? 'queued' : 'idle'
  }

  function clearQueue() {
    queue.value = []
    if (state.value === 'queued') {
      state.value = 'idle'
    }
  }

  return {
    state,
    queue,
    history,
    activeCount,
    latestHistory,
    enqueue,
    dequeue,
    startPlaying,
    finishPlaying,
    clearQueue,
  }
})