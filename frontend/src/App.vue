<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from './components/common/AppHeader.vue'
import AppBottomNav from './components/common/AppBottomNav.vue'
import { platform } from './plugins/capacitor'
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden bg-[var(--bg)]" data-theme="soundup" :data-platform="platform">
    <div
      class="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,209,102,0.28),transparent_36%),radial-gradient(circle_at_right_center,rgba(80,74,255,0.14),transparent_30%),linear-gradient(180deg,#faf7f0_0%,#f5f1e8_100%)]"
      aria-hidden="true"
    ></div>
    <AppHeader />

    <main class="relative z-10 px-4 pb-36 pt-2">
      <RouterView />
    </main>

    <AppBottomNav />
  </div>
</template>
