<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useProjectStore } from '../stores/project'

const route = useRoute()
const projectStore = useProjectStore()

const projectId = computed(() => String(route.params.projectId ?? ''))
const configId = computed(() => String(route.params.configId ?? ''))

const project = computed(() => projectStore.projects.find((item) => item.id === projectId.value) ?? null)
const config = computed(() => project.value?.configs.find((item) => item.id === configId.value) ?? null)
</script>

<template>
  <section v-if="config" class="mx-auto flex w-full max-w-md flex-col gap-4">
    <div class="rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)] backdrop-blur">
      <h2 class="text-lg font-bold text-base-content">{{ project?.name }} / {{ config.name }}</h2>

      <div class="mt-4 space-y-4 text-sm">
        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">概要</span>
          <input class="input input-bordered h-11 w-full rounded-2xl" :value="config.description" />
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">タイマー/アラーム</span>
          <select class="select select-bordered h-11 w-full rounded-2xl" :value="config.timerType">
            <option value="timer">タイマー</option>
            <option value="alarm">アラーム</option>
          </select>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">再生間隔</span>
          <div class="grid grid-cols-3 gap-2">
            <input class="input input-bordered h-11 rounded-2xl text-center" :value="String(config.interval.days).padStart(2, '0')" />
            <input class="input input-bordered h-11 rounded-2xl text-center" :value="String(config.interval.hours).padStart(2, '0')" />
            <input class="input input-bordered h-11 rounded-2xl text-center" :value="String(config.interval.minutes).padStart(2, '0')" />
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">タイマー終了時/アラーム時の操作</span>
          <div class="flex items-center justify-between">
            <span class="text-base-content/45">ONで操作が必要になります</span>
            <input :checked="config.requireActionOnEnd" type="checkbox" class="toggle" />
          </div>
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">再生対象</span>
          <input type="file" class="file-input" />
        </div>

        <div class="grid grid-cols-[96px_1fr] items-center gap-3">
          <span class="font-semibold text-base-content/75">再生方法</span>
          <select class="select select-bordered h-11 w-full rounded-2xl" :value="config.playbackMode">
            <option value="random">ランダムまたは順番再生を選択</option>
            <option value="random">ランダム</option>
            <option value="sequential">順番再生</option>
          </select>
        </div>

        <div class="grid grid-cols-[96px_1fr] gap-3">
          <span class="font-semibold text-base-content/75">アイテム</span>
          <div class="space-y-3">
            <div class="flex gap-3 rounded-2xl bg-base-200/70 p-3">
              <div class="h-14 w-14 rounded-2xl bg-[linear-gradient(135deg,#f78b5a,#f2d28f)]"></div>
              <div class="text-sm">
                <p class="font-semibold">説明</p>
                <p class="text-base-content/45">ファイル名/フォルダ名</p>
                <p class="font-semibold text-base-content/70">ファイル数: 01</p>
              </div>
            </div>
            <div class="flex gap-3 rounded-2xl bg-base-200/70 p-3">
              <div class="h-14 w-14 rounded-2xl bg-[linear-gradient(135deg,#d5c36b,#f6efc3)]"></div>
              <div class="text-sm">
                <p class="font-semibold">説明</p>
                <p class="text-base-content/45">ファイル名/フォルダ名</p>
                <p class="font-semibold text-base-content/70">ファイル数: 01</p>
              </div>
            </div>
          </div>
        </div>

        <dl class="space-y-2 border-t border-base-300 pt-3 text-sm">
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">再生間隔</dt>
            <dd>5min</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">アラーム時の操作</dt>
            <dd>なし</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">再生方法</dt>
            <dd>ループ/ランダム</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="font-semibold text-base-content/75">合計</dt>
            <dd>27ファイル</dd>
          </div>
        </dl>

        <button class="btn btn-neutral mt-2 h-14 rounded-2xl text-base font-bold">設定</button>
      </div>
    </div>
  </section>

  <section v-else class="mx-auto max-w-md rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)]">
    <h2 class="text-lg font-bold text-base-content">設定ファイルが見つかりません</h2>
  </section>
</template>