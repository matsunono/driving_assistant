<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useProjectStore } from '../stores/project'
import type { PlaybackMode, TimerType } from '../types/config'

const route = useRoute()
const projectStore = useProjectStore()

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
  targetPath: '',
})

const selectedItems = ref<SelectedItem[]>([])
const invalidFiles = ref<string[]>([])
const saveMessage = ref('')

const isTimerMode = computed(() => form.value.timerType === 'timer')

const intervalSummary = computed(() => {
  return `${String(form.value.intervalHours).padStart(2, '0')}時間${String(form.value.intervalMinutes).padStart(2, '0')}分ごと`
})

const alarmSummary = computed(() => {
  return `${form.value.alarmYear}年${String(form.value.alarmMonth).padStart(2, '0')}月${String(form.value.alarmDay).padStart(2, '0')}日 ${String(form.value.alarmHours).padStart(2, '0')}時${String(form.value.alarmMinutes).padStart(2, '0')}分`
})

const playbackSummary = computed(() => (form.value.playbackMode === 'random' ? 'ランダム再生' : '順番再生'))

const operationSummary = computed(() => (form.value.requireActionOnEnd ? 'ON（操作があるまで次回停止）' : 'OFF（自動継続）'))

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

    selectedItems.value = []
    invalidFiles.value = []
    saveMessage.value = ''
  },
  { immediate: true },
)

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

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  const itemsToAdd: SelectedItem[] = []

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
  }

  addUniqueItems(itemsToAdd)
  input.value = ''
}

function onFolderPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  const folderMap = new Map<string, { path: string; count: number }>()

  for (const file of files) {
    if (!isAudioFile(file)) {
      invalidFiles.value.push(file.webkitRelativePath || file.name)
      continue
    }

    const relativePath = file.webkitRelativePath || file.name
    const firstSegment = relativePath.includes('/') ? relativePath.split('/')[0] : relativePath
    const topFolder = firstSegment || 'selected-folder'
    const current = folderMap.get(topFolder)

    if (!current) {
      folderMap.set(topFolder, { path: topFolder, count: 1 })
      continue
    }

    current.count += 1
  }

  const itemsToAdd: SelectedItem[] = Array.from(folderMap.entries()).map(([folderName, value]) => ({
    id: `${Date.now()}-${folderName}-${Math.random()}`,
    kind: 'folder',
    name: folderName,
    path: value.path,
    fileCount: value.count,
  }))

  addUniqueItems(itemsToAdd)
  input.value = ''
}

function removeItem(path: string) {
  selectedItems.value = selectedItems.value.filter((item) => item.path !== path)
}

function clearItems() {
  selectedItems.value = []
  invalidFiles.value = []
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

  const targetPath = selectedItems.value.length > 0 ? selectedItems.value.map((item) => item.path).join('; ') : form.value.targetPath

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
              <label class="btn btn-outline btn-sm rounded-xl">
                フォルダ追加
                <input type="file" class="hidden" webkitdirectory directory multiple @change="onFolderPicked" />
              </label>
              <button type="button" class="btn btn-ghost btn-sm rounded-xl" @click="clearItems">クリア</button>
            </div>
            <p class="text-xs text-base-content/55">音声ファイルのみ登録されます（mp3/wav/m4a/aac/ogg/flac）</p>
            <p v-if="invalidFiles.length" class="text-xs text-error">{{ invalidFiles.length }}件の非対応ファイルを除外しました</p>
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

        <button type="button" class="btn btn-neutral mt-2 h-14 w-full rounded-2xl text-base font-bold" @click="saveConfig">設定</button>
        <p v-if="saveMessage" class="text-xs text-success">{{ saveMessage }}</p>
      </div>
    </div>
  </section>

  <section v-else class="mx-auto max-w-md rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)]">
    <h2 class="text-lg font-bold text-base-content">設定ファイルが見つかりません</h2>
  </section>
</template>