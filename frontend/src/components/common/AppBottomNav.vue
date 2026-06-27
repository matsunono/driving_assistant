<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { faHouse, faFolder, faGear } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const router = useRouter()
const route = useRoute()

const tabs = [
  { label: 'Home', path: '/', icon: faHouse },
  { label: 'Projects', path: '/projects', icon: faFolder },
  { label: 'Settings', path: '/settings', icon: faGear },
]

function navigate(path: string) {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <nav class="bottom-nav" aria-label="Main Navigation">
    <button
      v-for="tab in tabs"
      :key="tab.path"
      type="button"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': route.path === tab.path }"
      @click="navigate(tab.path)"
    >
      {{ tab.label }}
      <FontAwesomeIcon :icon="tab.icon" />
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(245, 241, 232, 0), rgba(245, 241, 232, 0.92) 24%);
}

.bottom-nav__item {
  min-height: 3.15rem;
  border: 1px solid rgba(24, 22, 21, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--muted);
  font-weight: 700;
}

.bottom-nav__item--active {
  background: var(--accent);
  color: #fff;
}
</style>