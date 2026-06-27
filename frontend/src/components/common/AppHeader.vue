<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
  <header class="app-header">
    <button v-if="canGoBack" type="button" class="app-header__back" @click="goBack">戻る</button>
    <div class="app-header__title-wrap">
      <p class="eyebrow">Sound Up</p>
      <h1 class="app-header__title">{{ title }}</h1>
    </div>
    <span class="app-header__badge">β</span>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem;
  backdrop-filter: blur(16px);
}

.app-header__back,
.app-header__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  min-height: 3rem;
  padding: 0 0.9rem;
  border: 1px solid rgba(24, 22, 21, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--text);
  font-weight: 700;
}

.app-header__title-wrap {
  min-width: 0;
}

.app-header__title {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.2;
}
</style>