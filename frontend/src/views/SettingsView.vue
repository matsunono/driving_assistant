<script setup lang="ts">
import { ref, watch } from 'vue'

const themeOptions = [
  { label: 'Sound Up', value: 'soundup' },
  { label: 'Cupcake', value: 'cupcake' },
] as const

const theme = ref<(typeof themeOptions)[number]['value']>('soundup')

watch(
  theme,
  (value) => {
    document.documentElement.setAttribute('data-theme', value)
  },
  { immediate: true },
)
</script>

<template>
  <section class="mx-auto flex w-full max-w-md flex-col gap-4">
    <div class="rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)] backdrop-blur">
      <p class="text-sm text-base-content/40">Settings</p>
      <h2 class="mt-1 text-xl font-bold text-base-content">アプリ設定</h2>
      <p class="mt-1 text-sm text-base-content/45">再生通知、権限、バックグラウンド動作をここで管理します。</p>

      <div class="mt-4 space-y-3">
        <div class="rounded-2xl border border-base-300 bg-white p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-base-content">テーマカラー</p>
              <p class="text-sm text-base-content/45">daisyUI のテーマを WebView 上で切り替えます</p>
            </div>
            <select v-model="theme" class="select w-1/2 text-sm">
                <option v-for="option in themeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
            </select>
            <!-- <label class="input input-bordered flex h-10 w-40 items-center gap-2 rounded-2xl">
              
            </label> -->
          </div>
        </div>

        <div class="rounded-2xl border border-base-300 bg-white p-4">
          <strong class="text-base-content">ForegroundService</strong>
          <p class="mt-1 text-sm text-base-content/45">再生状態の正をネイティブ側で管理します。</p>
        </div>

        <div class="rounded-2xl border border-base-300 bg-white p-4">
          <strong class="text-base-content">Audio Ducking</strong>
          <p class="mt-1 text-sm text-base-content/45">外部音楽再生時に音量を下げて音声を重ねます。</p>
        </div>

        <div class="rounded-2xl border border-base-300 bg-white p-4">
          <strong class="text-base-content">SAF</strong>
          <p class="mt-1 text-sm text-base-content/45">ローカルファイルとフォルダの選択を許可します。</p>
        </div>
      </div>
    </div>
  </section>
</template>