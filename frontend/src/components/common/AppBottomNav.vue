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
    <div class="dock">
      <button v-for="tab in tabs" :key="tab.path" type="button"
        class="flex flex-col items-center gap-1 text-xs font-medium text-base-content/50 w-full"
        :class="{ 'text-base-content': route.path === tab.path }" @click="navigate(tab.path)">
        <span class="flex h-10 w-full items-center justify-center rounded-full"
          :class="route.path === tab.path ? 'bg-neutral text-neutral-content shadow-sm' : 'bg-white/75 text-base-content'">
          <FontAwesomeIcon class="text-base" :icon="tab.icon" />
        </span>
        <span class="dock-label">{{ tab.label }}</span>
      </button>
    </div>
</template>