<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useProjectStore } from '../stores/project'
import { usePlaybackStore } from '../stores/playback'
import type { PlaybackQueueItem } from '../services/playbackEngine'
import {
  getRuntimeSnapshot,
  startRuntime,
  stopRuntime,
  subscribeRuntimeSnapshot,
  triggerRuntimeNow as triggerRuntimeNowService,
} from '../services/playbackRuntime'
import type { PlaybackMode, TimerType } from '../types/config'

const route = useRoute()
const projectStore = useProjectStore()
const playbackStore = usePlaybackStore()

const projectId = computed(() => String(route.params.projectId ?? ''))
const configId = computed(() => String(route.params.configId ?? ''))

const project = computed(() => projectStore.projects.find((item) => item.id === projectId.value) ?? null)
const config = computed(() => project.value?.configs.find((item) => item.id === configId.value) ?? null)

type ItemKind = 'file' | 'folder'

interface SelectedItem {
  id: string
  kind: ItemKind
  name: string
  path: string
  fileCount: number
}

interface SelectedAudioFile {
  id: string
  name: string
  relativePath: string
  objectUrl: string
  sourceFile: File
}

const form = ref({
  description: '',
  timerType: 'timer' as TimerType,
  intervalHours: 0,
  intervalMinutes: 30,
  alarmYear: 2026,
  alarmMonth: 1,
  alarmDay: 1,
  alarmHours: 9,
  alarmMinutes: 0,
  requireActionOnEnd: false,
  playbackMode: 'random' as PlaybackMode,
  targetBaseDir: '',
  targetPath: '',
})

const selectedItems = ref<SelectedItem[]>([])
const selectedAudioFiles = ref<SelectedAudioFile[]>([])
const invalidFiles = ref<string[]>([])
const saveMessage = ref('')
const previewError = ref('')
const previewAudio = ref<HTMLAudioElement | null>(null)
const previewIndex = ref(0)
const isPreviewPlaying = ref(false)
const runtimeMessage = ref('')
const runtimeSnapshot = ref(getRuntimeSnapshot())
let unsubscribeRuntimeSnapshot: (() => void) | null = null

const isTimerMode = computed(() => form.value.timerType === 'timer')
const requiresBaseDir = computed(() => selectedAudioFiles.value.length > 0)
const hasValidBaseDir = computed(() => form.value.targetBaseDir.trim().length > 0)
const canSaveConfig = computed(() => !requiresBaseDir.value || hasValidBaseDir.value)
const isEngineRunning = computed(() => runtimeSnapshot.value.running)

const intervalSummary = computed(() => {
  return `${String(form.value.intervalHours).padStart(2, '0')}時間${String(form.value.intervalMinutes).padStart(2, '0')}分ごと`
})

const alarmSummary = computed(() => {
  return `${form.value.alarmYear}年${String(form.value.alarmMonth).padStart(2, '0')}月${String(form.value.alarmDay).padStart(2, '0')}日 ${String(form.value.alarmHours).padStart(2, '0')}時${String(form.value.alarmMinutes).padStart(2, '0')}分`
})

const playbackSummary = computed(() => (form.value.playbackMode === 'random' ? 'ランダム再生' : '順番再生'))

const operationSummary = computed(() => (form.value.requireActionOnEnd ? 'ON（操作があるまで次回停止）' : 'OFF（自動継続）'))

const currentPreviewFile = computed(() => selectedAudioFiles.value[previewIndex.value] ?? null)

watch(
  config,
  (nextConfig) => {
    if (!nextConfig) {
      return
    }

    const now = new Date()
    const alarm = nextConfig.alarmTime ? new Date(nextConfig.alarmTime) : null
    const hasAlarm = alarm && !Number.isNaN(alarm.getTime())

    form.value.description = nextConfig.description
    form.value.timerType = nextConfig.timerType
    form.value.intervalHours = nextConfig.interval.hours
    form.value.intervalMinutes = nextConfig.interval.minutes
    form.value.alarmYear = hasAlarm ? alarm.getFullYear() : now.getFullYear()
    form.value.alarmMonth = hasAlarm ? alarm.getMonth() + 1 : now.getMonth() + 1
    form.value.alarmDay = hasAlarm ? alarm.getDate() : now.getDate()
    form.value.alarmHours = hasAlarm ? alarm.getHours() : now.getHours()
    form.value.alarmMinutes = hasAlarm ? alarm.getMinutes() : 0
    form.value.requireActionOnEnd = nextConfig.requireActionOnEnd
    form.value.playbackMode = nextConfig.playbackMode
    form.value.targetPath = nextConfig.targetPath
    form.value.targetBaseDir = deriveBaseDirFromTargetPath(nextConfig.targetPath)

    revokeAllPreviewUrls()
    selectedItems.value = buildItemsFromTargetPath(nextConfig.targetPath)
    selectedAudioFiles.value = []
    invalidFiles.value = []
    saveMessage.value = ''
    previewError.value = ''
    stopPreview()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  unsubscribeRuntimeSnapshot?.()
  unsubscribeRuntimeSnapshot = null

  stopPreview()
  revokeAllPreviewUrls()
})

onMounted(() => {
  unsubscribeRuntimeSnapshot = subscribeRuntimeSnapshot((snapshot) => {
    runtimeSnapshot.value = snapshot
  })
})

function isAudioFile(file: File) {
  if (file.type.startsWith('audio/')) {
    return true
  }

  const lowered = file.name.toLowerCase()
  return ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].some((ext) => lowered.endsWith(ext))
}

function addUniqueItems(items: SelectedItem[]) {
  const map = new Map(selectedItems.value.map((item) => [item.path, item]))
  for (const item of items) {
    map.set(item.path, item)
  }
  selectedItems.value = Array.from(map.values())
}

function addUniqueAudioFiles(files: SelectedAudioFile[]) {
  const map = new Map(selectedAudioFiles.value.map((item) => [item.relativePath, item]))

  for (const file of files) {
    const existing = map.get(file.relativePath)
    if (existing) {
      URL.revokeObjectURL(file.objectUrl)
      continue
    }
    map.set(file.relativePath, file)
  }

  selectedAudioFiles.value = Array.from(map.values())
}

function revokeAllPreviewUrls() {
  for (const file of selectedAudioFiles.value) {
    URL.revokeObjectURL(file.objectUrl)
  }
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  const itemsToAdd: SelectedItem[] = []
  const audioFilesToAdd: SelectedAudioFile[] = []

  for (const file of files) {
    if (!isAudioFile(file)) {
      invalidFiles.value.push(file.name)
      continue
    }

    itemsToAdd.push({
      id: `${Date.now()}-${file.name}-${Math.random()}`,
      kind: 'file',
      name: file.name,
      path: file.name,
      fileCount: 1,
    })

    audioFilesToAdd.push({
      id: `${Date.now()}-${file.name}-${Math.random()}`,
      name: file.name,
      relativePath: file.name,
      objectUrl: URL.createObjectURL(file),
      sourceFile: file,
    })
  }

  addUniqueItems(itemsToAdd)
  addUniqueAudioFiles(audioFilesToAdd)
  input.value = ''
}

function removeItem(path: string) {
  const removed = selectedAudioFiles.value.filter(
    (file) => file.relativePath === path || file.relativePath.startsWith(`${path}/`),
  )
  for (const file of removed) {
    URL.revokeObjectURL(file.objectUrl)
  }

  selectedAudioFiles.value = selectedAudioFiles.value.filter(
    (file) => file.relativePath !== path && !file.relativePath.startsWith(`${path}/`),
  )

  if (previewIndex.value >= selectedAudioFiles.value.length) {
    previewIndex.value = Math.max(0, selectedAudioFiles.value.length - 1)
  }

  if (selectedAudioFiles.value.length === 0) {
    stopPreview()
  }

  selectedItems.value = selectedItems.value.filter((item) => item.path !== path)

  if (selectedAudioFiles.value.length === 0) {
    form.value.targetPath = selectedItems.value.map((item) => item.path).join('; ')
  }
}

function clearItems() {
  stopPreview()
  revokeAllPreviewUrls()
  selectedItems.value = []
  selectedAudioFiles.value = []
  previewIndex.value = 0
  previewError.value = ''
  invalidFiles.value = []
}

function deriveBaseDirFromTargetPath(targetPath: string) {
  if (!targetPath) {
    return ''
  }

  const firstPath = targetPath.split(';').map((item) => item.trim()).find(Boolean)
  if (!firstPath) {
    return ''
  }

  const lastSlashIndex = firstPath.lastIndexOf('/')
  if (lastSlashIndex <= 0) {
    return ''
  }

  return firstPath.slice(0, lastSlashIndex)
}

function parseTargetPathEntries(targetPath: string) {
  return targetPath
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function extractFileName(path: string) {
  const normalized = path.replace(/\\/g, '/')
  const chunks = normalized.split('/').filter(Boolean)
  return chunks.at(-1) ?? path
}

function buildItemsFromTargetPath(targetPath: string): SelectedItem[] {
  const entries = parseTargetPathEntries(targetPath)
  return entries.map((path, index) => ({
    id: `saved-item-${index}-${path}`,
    kind: 'file',
    name: extractFileName(path),
    path,
    fileCount: 1,
  }))
}

function normalizeJoin(baseDir: string, relativePath: string) {
  const normalizedBase = baseDir.trim().replace(/\/+$/, '')
  const normalizedRelative = relativePath.replace(/^\/+/, '')
  if (!normalizedBase) {
    return normalizedRelative
  }
  return `${normalizedBase}/${normalizedRelative}`
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null
}

function stopPreview() {
  if (!previewAudio.value) {
    isPreviewPlaying.value = false
    return
  }

  previewAudio.value.pause()
  previewAudio.value.currentTime = 0
  isPreviewPlaying.value = false
}

async function playPreview() {
  if (!currentPreviewFile.value) {
    previewError.value = '試聴できる音声がありません'
    return
  }

  previewError.value = ''

  if (!previewAudio.value) {
    previewAudio.value = new Audio()
    previewAudio.value.addEventListener('ended', () => {
      isPreviewPlaying.value = false
    })
  }

  previewAudio.value.src = currentPreviewFile.value.objectUrl

  try {
    await previewAudio.value.play()
    isPreviewPlaying.value = true
  } catch {
    isPreviewPlaying.value = false
    previewError.value = 'この環境では試聴再生を開始できませんでした'
  }
}

function movePreview(step: number) {
  if (selectedAudioFiles.value.length === 0) {
    return
  }

  const maxIndex = selectedAudioFiles.value.length - 1
  const nextIndex = Math.min(maxIndex, Math.max(0, previewIndex.value + step))
  previewIndex.value = nextIndex

  if (isPreviewPlaying.value) {
    void playPreview()
  }
}

function buildRuntimeQueue(): PlaybackQueueItem[] {
  if (selectedAudioFiles.value.length > 0) {
    return selectedAudioFiles.value
      .map<PlaybackQueueItem | null>((file) => {
        const sourcePath = hasValidBaseDir.value
          ? normalizeJoin(form.value.targetBaseDir, file.relativePath)
          : undefined

        return {
          id: file.id,
          label: file.relativePath,
          sourcePath,
          // Use a dedicated URL for runtime playback so preview URL revocation on page unmount
          // does not break already-started playback schedules.
          url: URL.createObjectURL(file.sourceFile),
        }
      })
      .filter(isNonNull)
  }

  const entries = parseTargetPathEntries(form.value.targetPath)
  return entries
    .map<PlaybackQueueItem | null>((path, index) => {
      const sourcePath = path.trim()
      if (!sourcePath) {
        return null
      }

      return {
        id: `saved-path-${index}`,
        label: extractFileName(sourcePath),
        sourcePath,
      }
    })
    .filter(isNonNull)
}

function buildIntervalMinutes() {
  const hours = Math.max(0, Math.trunc(form.value.intervalHours))
  const minutes = Math.max(0, Math.trunc(form.value.intervalMinutes))
  const totalMinutes = hours * 60 + minutes
  return Math.max(1, totalMinutes)
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

async function startRuntimeSchedule() {
  if (!config.value) {
    return
  }

  if (!project.value?.enabled) {
    runtimeMessage.value = 'プロジェクトがOFFのため開始できません'
    return
  }

  if (!config.value.enabled) {
    runtimeMessage.value = 'この設定ファイルがOFFのため開始できません'
    return
  }

  if (selectedAudioFiles.value.length > 0 && !hasValidBaseDir.value) {
    runtimeMessage.value = '再生対象を追加した場合は保存先ベースを入力してください'
    return
  }

  const queue = buildRuntimeQueue()
  if (queue.length === 0) {
    runtimeMessage.value = '再生対象が未選択のため開始できません'
    return
  }

  const currentConfig = config.value
  const currentProject = project.value

  try {
    runtimeSnapshot.value = await startRuntime({
      configId: currentConfig.id,
      configName: currentConfig.name,
      timerType: form.value.timerType,
      intervalMinutes: buildIntervalMinutes(),
      alarmTime: form.value.timerType === 'alarm' ? buildAlarmTimeIso() : undefined,
      playbackMode: form.value.playbackMode,
      queue,
      onPlayed: ({ label, result }) => {
        playbackStore.finishPlaying({
          projectId: currentProject?.id ?? '',
          configId: currentConfig.id,
          title: label,
          result,
        })
      },
    })

    if (runtimeSnapshot.value.running) {
      runtimeMessage.value = '再生スケジュールを開始しました'
      return
    }

    runtimeMessage.value = runtimeSnapshot.value.errorMessage ?? '再生スケジュールの開始に失敗しました'
  } catch (error) {
    runtimeMessage.value = toRuntimeErrorMessage(error, '再生スケジュール開始時にエラーが発生しました')
  }
}

async function triggerRuntimeNow() {
  if (!project.value?.enabled) {
    runtimeMessage.value = 'プロジェクトがOFFのため再生できません'
    return
  }

  if (!config.value?.enabled) {
    runtimeMessage.value = 'この設定ファイルがOFFのため再生できません'
    return
  }

  try {
    runtimeSnapshot.value = await triggerRuntimeNowService()
    runtimeMessage.value = runtimeSnapshot.value.errorMessage ?? '即時再生を実行しました'
  } catch (error) {
    runtimeMessage.value = toRuntimeErrorMessage(error, '即時再生でエラーが発生しました')
  }
}

function stopRuntimeSchedule() {
  runtimeSnapshot.value = stopRuntime()
  runtimeMessage.value = '再生スケジュールを停止しました'
}

function buildAlarmTimeIso() {
  const year = form.value.alarmYear
  const month = String(form.value.alarmMonth).padStart(2, '0')
  const day = String(form.value.alarmDay).padStart(2, '0')
  const hours = String(form.value.alarmHours).padStart(2, '0')
  const minutes = String(form.value.alarmMinutes).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:00`
}

function sanitizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function toPadded(value: number, length: number) {
  return String(Math.max(0, Math.trunc(value))).padStart(length, '0')
}

function clampFromInput(raw: string, min: number, max: number, fallback = min) {
  const digits = sanitizeDigits(raw, 8)
  if (!digits) {
    return fallback
  }

  const parsed = Number.parseInt(digits, 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function blockNonDigits(event: KeyboardEvent) {
  const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (allowed.includes(event.key)) {
    return
  }

  if (!/^[0-9]$/.test(event.key)) {
    event.preventDefault()
  }
}

function updateIntervalHours(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.intervalHours = clampFromInput(input.value, 0, 99, 0)
}

function updateIntervalMinutes(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.intervalMinutes = clampFromInput(input.value, 0, 59, 0)
}

function updateAlarmYear(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.alarmYear = clampFromInput(input.value, 2000, 9999, new Date().getFullYear())
}

function updateAlarmMonth(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.alarmMonth = clampFromInput(input.value, 1, 12, 1)
}

function updateAlarmDay(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.alarmDay = clampFromInput(input.value, 1, 31, 1)
}

function updateAlarmHours(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.alarmHours = clampFromInput(input.value, 0, 23, 0)
}

function updateAlarmMinutes(event: Event) {
  const input = event.target as HTMLInputElement
  form.value.alarmMinutes = clampFromInput(input.value, 0, 59, 0)
}

function saveConfig() {
  if (!config.value) {
    return
  }

  if (!canSaveConfig.value) {
    saveMessage.value = '保存先ベースを入力してください'
    return
  }

  const hasSelectedAudio = selectedAudioFiles.value.length > 0
  const resolvedPaths = hasSelectedAudio
    ? selectedAudioFiles.value.map((file) => normalizeJoin(form.value.targetBaseDir, file.relativePath))
    : []
  const targetPath = hasSelectedAudio ? resolvedPaths.join('; ') : form.value.targetPath

  projectStore.updateConfig(projectId.value, configId.value, {
    description: form.value.description,
    timerType: form.value.timerType,
    interval: {
      days: 0,
      hours: Math.max(0, form.value.intervalHours),
      minutes: Math.max(0, form.value.intervalMinutes),
    },
    alarmTime: isTimerMode.value ? undefined : buildAlarmTimeIso(),
    requireActionOnEnd: form.value.requireActionOnEnd,
    playbackMode: form.value.playbackMode,
    targetPath,
  })

  form.value.targetPath = targetPath
  saveMessage.value = '設定内容を更新しました（JSONへ自動保存済み）'
}
</script>

<template>
  <section v-if="config" class="mx-auto flex w-full max-w-md flex-col gap-4">
    <div class="rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)] backdrop-blur">
      <h2 class="text-lg font-bold text-base-content">{{ project?.name }} / {{ config.name }}</h2>

      <div class="mt-4 space-y-4 text-sm">
        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">概要</span>
          <input v-model="form.description" class="input input-bordered h-11 w-full rounded-2xl" />
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">タイマー/<br>アラーム</span>
          <select v-model="form.timerType" class="select select-bordered h-11 w-full rounded-2xl">
            <option value="timer">タイマー</option>
            <option value="alarm">アラーム</option>
          </select>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-start gap-3">
          <span class="font-semibold text-base-content/75">再生間隔</span>
          <div class="space-y-1">
            <div class="flex items-center gap-1">
              <input
                :value="toPadded(form.intervalHours, 2)"
                :disabled="!isTimerMode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                class="input input-bordered h-10 w-14 rounded-xl px-1 text-center"
                @keydown="blockNonDigits"
                @input="updateIntervalHours"
              />
              <span class="text-xs text-base-content/50">:</span>
              <input
                :value="toPadded(form.intervalMinutes, 2)"
                :disabled="!isTimerMode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                class="input input-bordered h-10 w-14 rounded-xl px-1 text-center"
                @keydown="blockNonDigits"
                @input="updateIntervalMinutes"
              />
            </div>
            <p class="text-xs text-base-content/50">タイマー時のみ有効</p>
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-start gap-3">
          <span class="pt-2 font-semibold text-base-content/75">日時設定</span>
          <div class="space-y-2">
            <div class="flex items-center gap-1 whitespace-nowrap">
              <span class="w-8 text-xs font-semibold text-base-content/60">日付</span>
              <input
                :value="String(form.alarmYear)"
                :disabled="isTimerMode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="4"
                class="input input-bordered h-10 w-16 rounded-xl px-1 text-center"
                @keydown="blockNonDigits"
                @input="updateAlarmYear"
              />
              <span class="w-2 text-center text-xs text-base-content/50">/</span>
              <input
                :value="toPadded(form.alarmMonth, 2)"
                :disabled="isTimerMode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                class="input input-bordered h-10 w-12 rounded-xl px-1 text-center"
                @keydown="blockNonDigits"
                @input="updateAlarmMonth"
              />
              <span class="w-2 text-center text-xs text-base-content/50">/</span>
              <input
                :value="toPadded(form.alarmDay, 2)"
                :disabled="isTimerMode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                class="input input-bordered h-10 w-12 rounded-xl px-1 text-center"
                @keydown="blockNonDigits"
                @input="updateAlarmDay"
              />
            </div>
            <div class="flex items-center gap-1 whitespace-nowrap">
              <span class="w-8 text-xs font-semibold text-base-content/60">時刻</span>
              <input
                :value="toPadded(form.alarmHours, 2)"
                :disabled="isTimerMode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                class="input input-bordered h-10 w-12 rounded-xl px-1 text-center"
                @keydown="blockNonDigits"
                @input="updateAlarmHours"
              />
              <span class="w-2 text-center text-xs text-base-content/50">:</span>
              <input
                :value="toPadded(form.alarmMinutes, 2)"
                :disabled="isTimerMode"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="2"
                class="input input-bordered h-10 w-12 rounded-xl px-1 text-center"
                @keydown="blockNonDigits"
                @input="updateAlarmMinutes"
              />
            </div>
            <p class="text-xs text-base-content/50">アラーム時のみ有効（YYYY/MM/DD HH:mm）</p>
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">次回実行条件</span>
          <div class="flex items-center justify-between">
            <span class="text-base-content/45">ONで操作が必要になります</span>
            <input v-model="form.requireActionOnEnd" type="checkbox" class="toggle" />
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-start gap-3">
          <span class="font-semibold text-base-content/75">再生対象</span>
          <div class="space-y-2">
            <div class="flex flex-wrap gap-2">
              <label class="btn btn-outline btn-sm rounded-xl">
                ファイル追加
                <input type="file" class="hidden" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" multiple @change="onFilePicked" />
              </label>
              <button type="button" class="btn btn-ghost btn-sm rounded-xl" @click="clearItems">クリア</button>
            </div>
            <p class="text-xs text-base-content/55">音声ファイルのみ登録されます（mp3/wav/m4a/aac/ogg/flac）</p>
            <p v-if="invalidFiles.length" class="text-xs text-error">{{ invalidFiles.length }}件の非対応ファイルを除外しました</p>
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">保存先ベース</span>
          <div class="space-y-1">
            <input
              v-model="form.targetBaseDir"
              type="text"
              class="input input-bordered h-10 w-full rounded-xl"
              placeholder="例: /storage/emulated/0/Music/drive"
            />
            <p v-if="requiresBaseDir && !hasValidBaseDir" class="text-xs text-error">再生対象を選択した場合は保存先ベースが必須です</p>
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-start gap-3">
          <span class="font-semibold text-base-content/75">試聴</span>
          <div class="space-y-2 rounded-2xl bg-base-200/60 p-3">
            <p class="text-xs text-base-content/70">
              {{ currentPreviewFile ? `選択中: ${currentPreviewFile.relativePath}` : '試聴対象が未選択です' }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn btn-outline btn-xs" :disabled="previewIndex === 0" @click="movePreview(-1)">前へ</button>
              <button type="button" class="btn btn-outline btn-xs" :disabled="!currentPreviewFile" @click="playPreview">再生</button>
              <button type="button" class="btn btn-ghost btn-xs" :disabled="!isPreviewPlaying" @click="stopPreview">停止</button>
              <button
                type="button"
                class="btn btn-outline btn-xs"
                :disabled="selectedAudioFiles.length === 0 || previewIndex >= selectedAudioFiles.length - 1"
                @click="movePreview(1)"
              >
                次へ
              </button>
            </div>
            <p v-if="previewError" class="text-xs text-error">{{ previewError }}</p>
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-start gap-3">
          <span class="font-semibold text-base-content/75">再生実行</span>
          <div class="space-y-2 rounded-2xl bg-base-200/60 p-3">
            <p class="text-xs text-base-content/70">
              状態: {{ isEngineRunning ? '実行中' : '停止中' }}
            </p>
            <p class="text-xs text-base-content/70" v-if="runtimeSnapshot.nextRunAt">
              次回実行: {{ runtimeSnapshot.nextRunAt }}
            </p>
            <p class="text-xs text-base-content/70" v-if="runtimeSnapshot.lastPlayedLabel">
              最終再生: {{ runtimeSnapshot.lastPlayedLabel }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn btn-outline btn-xs" :disabled="isEngineRunning" @click="startRuntimeSchedule">開始</button>
              <button type="button" class="btn btn-outline btn-xs" :disabled="!isEngineRunning" @click="stopRuntimeSchedule">停止</button>
              <button type="button" class="btn btn-ghost btn-xs" @click="triggerRuntimeNow">今すぐ再生</button>
            </div>
            <p v-if="runtimeMessage" class="text-xs text-base-content/70">{{ runtimeMessage }}</p>
            <p v-if="runtimeSnapshot.errorMessage" class="text-xs text-error">{{ runtimeSnapshot.errorMessage }}</p>
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] gap-3">
          <span class="font-semibold text-base-content/75">アイテム</span>
          <div class="space-y-2">
            <div
              v-for="item in selectedItems"
              :key="item.path"
              class="flex items-center justify-between gap-3 rounded-2xl bg-base-200/70 px-3 py-2"
            >
              <div class="text-sm">
                <p class="font-semibold">{{ item.name }}</p>
                <p class="text-xs text-base-content/55">{{ item.kind === 'folder' ? 'フォルダ' : 'ファイル' }} / {{ item.fileCount }}件</p>
              </div>
              <button type="button" class="btn btn-ghost btn-xs" @click="removeItem(item.path)">削除</button>
            </div>

            <p v-if="selectedItems.length === 0 && form.targetPath" class="text-xs text-base-content/60">既存パス: {{ form.targetPath }}</p>
            <p v-else-if="selectedItems.length === 0" class="text-xs text-base-content/60">再生対象が未選択です</p>
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">再生方法</span>
          <select v-model="form.playbackMode" class="select select-bordered h-11 w-full rounded-2xl">
            <option value="random">ランダム</option>
            <option value="sequential">順番再生</option>
          </select>
        </div>

        <dl class="space-y-2 border-t border-base-300 pt-3 text-sm">
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">再生間隔</dt>
            <dd>{{ isTimerMode ? intervalSummary : '無効（アラーム選択中）' }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">日時設定</dt>
            <dd>{{ isTimerMode ? '無効（タイマー選択中）' : alarmSummary }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">次回実行条件</dt>
            <dd>{{ operationSummary }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">再生方法</dt>
            <dd>{{ playbackSummary }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">合計アイテム</dt>
            <dd>{{ selectedItems.reduce((acc, item) => acc + item.fileCount, 0) }}ファイル</dd>
          </div>
        </dl>

        <button
          type="button"
          class="btn btn-neutral mt-2 h-14 w-full rounded-2xl text-base font-bold"
          :disabled="!canSaveConfig"
          @click="saveConfig"
        >
          設定
        </button>
        <p v-if="saveMessage" :class="canSaveConfig ? 'text-xs text-success' : 'text-xs text-error'">{{ saveMessage }}</p>
      </div>
    </div>
  </section>

  <section v-else class="mx-auto max-w-md rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)]">
    <h2 class="text-lg font-bold text-base-content">設定ファイルが見つかりません</h2>
  </section>
</template>