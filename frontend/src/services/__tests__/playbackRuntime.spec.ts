import { beforeEach, describe, expect, it, vi } from 'vitest'

const nativeStartMock = vi.fn(async (_options: unknown) => ({
  running: true,
  configId: 'cfg',
  configName: 'config',
  timerType: 'timer',
  queueSize: 1,
  nextRunAt: null,
  lastRunAt: null,
  lastPlayedLabel: null,
  errorMessage: null,
}))

const nativeSnapshotMock = vi.fn(async () => ({
  running: true,
  configId: 'cfg',
  configName: 'config',
  timerType: 'timer',
  queueSize: 1,
  nextRunAt: null,
  lastRunAt: null,
  lastPlayedLabel: null,
  errorMessage: null,
}))

const engineStartMock = vi.fn(async (_options: unknown) => ({
  running: true,
  configId: 'cfg',
  configName: 'config',
  timerType: 'timer',
  queueSize: 1,
  nextRunAt: null,
  lastRunAt: null,
  lastPlayedLabel: null,
  errorMessage: null,
}))

vi.mock('../../plugins/capacitor', () => ({
  isNativePlatform: () => true,
  isAndroidPlatform: () => true,
}))

vi.mock('../../plugins/nativePlayback', () => ({
  NativePlayback: {
    start: (options: unknown) => nativeStartMock(options),
    getSnapshot: () => nativeSnapshotMock(),
    triggerNow: vi.fn(),
    stop: vi.fn(),
    addListener: vi.fn(async () => ({ remove: vi.fn(async () => undefined) })),
  },
}))

vi.mock('../playbackEngine', () => ({
  PlaybackEngine: class {
    getSnapshot() {
      return {
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
    }

    start(options: unknown) {
      return engineStartMock(options)
    }

    triggerNow() {
      return Promise.resolve(this.getSnapshot())
    }

    stop() {
      return this.getSnapshot()
    }
  },
}))

describe('playbackRuntime native execution', () => {
  beforeEach(() => {
    nativeStartMock.mockClear()
    nativeSnapshotMock.mockClear()
    engineStartMock.mockClear()
  })

  it('uses native runtime on Android native platform', async () => {
    const { startRuntime } = await import('../playbackRuntime')

    const result = await startRuntime({
      configId: 'cfg',
      configName: 'config',
      timerType: 'timer',
      intervalMinutes: 1,
      playbackMode: 'random',
      queue: [{ id: '1', label: 'a', sourcePath: '/a.wav' }],
    })

    expect(nativeStartMock).toHaveBeenCalledTimes(1)
    expect(engineStartMock).not.toHaveBeenCalled()
    expect(result.running).toBe(true)
  })

  it('returns error snapshot when native start throws', async () => {
    nativeStartMock.mockImplementationOnce(async () => {
      throw new Error('NativePlayback plugin is not implemented on android')
    })

    const { startRuntime } = await import('../playbackRuntime')

    const result = await startRuntime({
      configId: 'cfg',
      configName: 'config',
      timerType: 'timer',
      intervalMinutes: 1,
      playbackMode: 'random',
      queue: [{ id: '1', label: 'a', sourcePath: '/a.wav' }],
    })

    expect(nativeStartMock).toHaveBeenCalledTimes(1)
    expect(result.running).toBe(false)
    expect(result.errorMessage).toContain('NativePlayback plugin is not implemented on android')
  })
})
