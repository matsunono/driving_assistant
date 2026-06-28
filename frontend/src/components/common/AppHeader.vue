<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const route = useRoute()
const router = useRouter()

const title = computed(() => {
  switch (route.name) {
    case 'projects':
      return 'プロジェクト一覧'
    case 'project-detail':
      return 'プロジェクト詳細'
    case 'config-detail':
      return '設定ファイル編集'
    case 'settings':
      return '設定'
    default:
      return 'さうんどあっぷ'
  }
})

const canGoBack = computed(() => route.name !== 'home')

function goBack() {
  router.back()
}
</script>

<template>
  <header class="sticky top-0 z-20 px-4 pb-3 pt-4 backdrop-blur-md">
    <div class="mx-auto flex w-full max-w-md items-center justify-between gap-3">
      <div class="flex h-10 w-10 items-center justify-center">
        <button
          v-if="canGoBack"
          type="button"
          class="btn btn-circle h-10 min-h-10 w-10 border border-base-300 bg-white/80 p-0 text-base-content shadow-none"
          @click="goBack"
        >
          <FontAwesomeIcon :icon="faAngleLeft" />
        </button>
      </div>

      <div class="min-w-0 flex-1 text-center">
        <h1 class="truncate text-xl font-bold text-base-content">
          {{ title }}
        </h1>
      </div>

      <div class="flex h-10 w-10 items-center justify-center"></div>
    </div>
    <div class="mx-auto mt-1 flex w-full max-w-md justify-center">
      <p class="text-[0.65rem] font-medium uppercase tracking-[0.26em] text-base-content/45">Sound App</p>
    </div>
  </header>
</template>