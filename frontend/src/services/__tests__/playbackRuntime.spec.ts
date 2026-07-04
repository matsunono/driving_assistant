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

const pluginAvailableMock = vi.fn((_name: string) => false)

vi.mock('../../plugins/capacitor', () => ({
  isNativePlatform: () => true,
  isAndroidPlatform: () => true,
  isPluginAvailable: (name: string) => pluginAvailableMock(name),
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

describe('playbackRuntime native plugin availability', () => {
  beforeEach(() => {
    nativeStartMock.mockClear()
    nativeSnapshotMock.mockClear()
    engineStartMock.mockClear()
    pluginAvailableMock.mockClear()
    pluginAvailableMock.mockReturnValue(false)
  })

  it('falls back to web engine when NativePlayback is unavailable', async () => {
    const { startRuntime } = await import('../playbackRuntime')

    const result = await startRuntime({
      configId: 'cfg',
      configName: 'config',
      timerType: 'timer',
      intervalMinutes: 1,
      playbackMode: 'random',
      queue: [{ id: '1', label: 'a', sourcePath: '/a.wav' }],
    })

    expect(pluginAvailableMock).toHaveBeenCalledWith('NativePlayback')
    expect(nativeStartMock).not.toHaveBeenCalled()
    expect(engineStartMock).toHaveBeenCalledTimes(1)
    expect(result.running).toBe(true)
  })

  it('uses native runtime when NativePlayback is available', async () => {
    pluginAvailableMock.mockReturnValue(true)
    const { startRuntime } = await import('../playbackRuntime')

    await startRuntime({
      configId: 'cfg',
      configName: 'config',
      timerType: 'timer',
      intervalMinutes: 1,
      playbackMode: 'random',
      queue: [{ id: '1', label: 'a', sourcePath: '/a.wav' }],
    })

    expect(nativeStartMock).toHaveBeenCalledTimes(1)
  })
})
