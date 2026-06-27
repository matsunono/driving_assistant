<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useProjectStore } from '../stores/project'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const projectId = computed(() => String(route.params.projectId ?? ''))
const project = computed(() => projectStore.projects.find((item) => item.id === projectId.value) ?? null)

function openConfig(configId: string) {
  router.push(`/projects/${projectId.value}/configs/${configId}`)
}
</script>

<template>
  <section class="page-card page-section" v-if="project">
    <p class="eyebrow">Project detail</p>
    <h2 class="heading">{{ project.name }}</h2>
    <p class="subtle">{{ project.description }}</p>

    <div class="config-list">
      <button
        v-for="config in project.configs"
        :key="config.id"
        type="button"
        class="config-card"
        @click="openConfig(config.id)"
      >
        <div class="config-card__row">
          <strong>{{ config.name }}</strong>
          <span :class="config.enabled ? 'pill pill--on' : 'pill'">
            {{ config.enabled ? 'ON' : 'OFF' }}
          </span>
        </div>
        <p>{{ config.description }}</p>
        <small>{{ config.playbackMode }} / {{ config.audioDucking ? 'ducking' : 'normal' }}</small>
      </button>
    </div>
  </section>

  <section v-else class="page-card page-section">
    <h2 class="heading">プロジェクトが見つかりません</h2>
  </section>
</template>

<style scoped>
.config-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.config-card {
  padding: 1rem;
  border: 1px solid rgba(24, 22, 21, 0.08);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
}

.config-card__row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.config-card p,
.config-card small {
  display: block;
  margin: 0.35rem 0 0;
  color: var(--muted);
}

.pill {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(24, 22, 21, 0.08);
  color: var(--muted);
  font-size: 0.85rem;
}

.pill--on {
  background: rgba(13, 127, 88, 0.14);
  color: var(--success);
}
</style>