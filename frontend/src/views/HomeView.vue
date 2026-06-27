<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { usePlaybackStore } from '../stores/playback'
import { useProjectStore } from '../stores/project'

const projectStore = useProjectStore()
const playbackStore = usePlaybackStore()
const router = useRouter()

const recentProjects = computed(() => projectStore.projects.slice(0, 3))

function openProject(projectId: string) {
  projectStore.selectProject(projectId)
  router.push(`/projects/${projectId}`)
}
</script>

<template>
  <section class="page-card page-section home-hero">
    <p class="eyebrow">Recent playback</p>
    <h2 class="heading">次に話しかける準備を整える</h2>
    <p class="subtle">
      再生履歴、キュー、プロジェクトのスター状態をひと目で確認できます。
    </p>
  </section>

  <section class="page-card page-section">
    <p class="eyebrow">Projects</p>
    <h3 class="heading">最近使ったプロジェクト</h3>

    <div class="project-list">
      <button
        v-for="project in recentProjects"
        :key="project.id"
        type="button"
        class="project-list__item"
        @click="openProject(project.id)"
      >
        <div>
          <strong>{{ project.name }}</strong>
          <p>{{ project.description }}</p>
        </div>
        <span class="project-list__meta">{{ project.configs.length }} configs</span>
      </button>
    </div>
  </section>

  <section class="page-card page-section">
    <p class="eyebrow">Playback</p>
    <h3 class="heading">再生履歴</h3>

    <ul class="history-list">
      <li v-for="item in playbackStore.latestHistory" :key="item.id" class="history-list__item">
        <div>
          <strong>{{ item.title }}</strong>
          <p>{{ item.playedAt }}</p>
        </div>
        <span class="history-list__result">{{ item.result }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.home-hero {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 224, 0.78));
}

.project-list,
.history-list {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  margin: 1rem 0 0;
  list-style: none;
}

.project-list__item,
.history-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(24, 22, 21, 0.08);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
}

.project-list__item p,
.history-list__item p {
  margin: 0.15rem 0 0;
  color: var(--muted);
}

.project-list__meta,
.history-list__result {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>