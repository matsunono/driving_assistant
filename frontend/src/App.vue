<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from './components/common/AppHeader.vue'
import AppBottomNav from './components/common/AppBottomNav.vue'
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__backdrop" aria-hidden="true"></div>
    <AppHeader />

    <main class="app-shell__main">
      <RouterView />
    </main>

    <AppBottomNav />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.app-shell__backdrop {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(255, 209, 102, 0.28), transparent 36%),
    radial-gradient(circle at right center, rgba(80, 74, 255, 0.14), transparent 30%),
    linear-gradient(180deg, #faf7f0 0%, #f5f1e8 100%);
  pointer-events: none;
}

.app-shell__main {
  position: relative;
  z-index: 1;
  padding: 1rem 1rem 7rem;
}
</style>
