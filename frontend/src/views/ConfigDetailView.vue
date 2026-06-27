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
  <section v-if="config" class="page-card page-section config-detail">
    <p class="eyebrow">Config detail</p>
    <h2 class="heading">{{ project?.name }} / {{ config.name }}</h2>
    <p class="subtle">{{ config.description }}</p>

    <div class="field-group">
      <label class="field">
        <span>概要</span>
        <textarea rows="3" :value="config.description"></textarea>
      </label>

      <div class="field-grid">
        <label class="field">
          <span>タイマー種別</span>
          <select :value="config.timerType">
            <option value="timer">タイマー</option>
            <option value="alarm">アラーム</option>
          </select>
        </label>

        <label class="field">
          <span>再生方法</span>
          <select :value="config.playbackMode">
            <option value="random">ランダム</option>
            <option value="sequential">順番再生</option>
          </select>
        </label>
      </div>
    </div>
  </section>

  <section v-else class="page-card page-section">
    <h2 class="heading">設定ファイルが見つかりません</h2>
  </section>
</template>

<style scoped>
.field-group {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.field span {
  font-size: 0.9rem;
  font-weight: 700;
}

.field-grid {
  display: grid;
  gap: 1rem;
}
</style>