<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { faHouse, faFolder, faGear } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const router = useRouter()
const route = useRoute()

const tabs = [
  { label: 'ホーム', path: '/', icon: faHouse },
  { label: 'プロジェクト', path: '/projects', icon: faFolder },
  { label: '設定', path: '/settings', icon: faGear },
]

function navigate(path: string) {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
    <div class="mx-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-base-300 bg-white/90 p-2 shadow-[0_10px_28px_rgba(28,24,19,0.16)] backdrop-blur">
      <button
        v-for="tab in tabs"
        :key="tab.path"
        type="button"
        class="flex w-full flex-col items-center gap-1 text-xs font-medium text-base-content/50"
        :class="{ 'text-base-content': route.path === tab.path }"
        @click="navigate(tab.path)"
      >
        <span
          class="flex h-10 w-full items-center justify-center rounded-full"
          :class="route.path === tab.path ? 'bg-neutral text-neutral-content shadow-sm' : 'bg-white/75 text-base-content'"
        >
          <FontAwesomeIcon class="text-base" :icon="tab.icon" />
        </span>
        <span class="truncate text-[11px]">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>