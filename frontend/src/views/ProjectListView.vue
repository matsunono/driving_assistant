<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useProjectStore } from '../stores/project'

const projectStore = useProjectStore()
const router = useRouter()

function openProject(projectId: string) {
  projectStore.selectProject(projectId)
  router.push(`/projects/${projectId}`)
}
</script>

<template>
  <section class="page-card page-section project-page">
    <p class="eyebrow">Projects</p>
    <h2 class="heading">プロジェクト一覧</h2>
    <p class="subtle">用途ごとに再生ルールと音声セットを分けて管理します。</p>

    <div class="project-grid">
      <button
        v-for="project in projectStore.projects"
        :key="project.id"
        type="button"
        class="project-card"
        @click="openProject(project.id)"
      >
        <div class="project-card__row">
          <strong>{{ project.name }}</strong>
          <span>{{ project.starred ? '★' : '☆' }}</span>
        </div>
        <p>{{ project.description }}</p>
        <small>{{ project.configs.length }} configs</small>
      </button>
    </div>
  </section>
</template>

<style scoped>
.project-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.project-card {
  padding: 1rem;
  border: 1px solid rgba(24, 22, 21, 0.08);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
}

.project-card__row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.project-card p,
.project-card small {
  display: block;
  margin: 0.35rem 0 0;
  color: var(--muted);
}
</style>