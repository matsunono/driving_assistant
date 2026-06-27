<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { faPenToSquare, faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import { usePlaybackStore } from '../stores/playback'
import { useProjectStore } from '../stores/project'

const projectStore = useProjectStore()
const playbackStore = usePlaybackStore()
const router = useRouter()

const recentProjects = computed(() => projectStore.projects.slice(0, 6))

function openProject(projectId: string) {
  projectStore.selectProject(projectId)
  router.push(`/projects/${projectId}`)
}

function editProject(projectId: string) {
  openProject(projectId)
}

function toggleProjectEnabled(projectId: string) {
  projectStore.toggleProjectEnabled(projectId)
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-md flex-col gap-4">
    <div class="rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)] backdrop-blur">
      <p class="text-sm text-base-content/40">History</p>
      <h2 class="mt-1 text-2xl font-bold text-base-content">履歴</h2>
      <div class="mt-4 space-y-3">
        <button
        v-for="project in recentProjects"
        :key="project.id"
        type="button"
        class="flex w-full items-start gap-3 rounded-2xl border border-base-300 bg-white px-3 py-3 text-left"
        @click="openProject(project.id)"
      >
          <span class="pt-1 text-base-content/70">
            <FontAwesomeIcon :icon="faStar" class="text-sm" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <strong class="truncate text-[15px] font-bold text-base-content">{{ project.name }}</strong>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="btn btn-square btn-sm border-none bg-neutral text-neutral-content shadow-none"
                  @click.stop="editProject(project.id)"
                >
                  <FontAwesomeIcon :icon="faPenToSquare" />
                </button>
                <input
                  :checked="project.enabled"
                  type="checkbox"
                  class="toggle toggle-sm border-neutral/20 bg-neutral-content/20 text-neutral"
                  @click.stop
                  @change="toggleProjectEnabled(project.id)"
                />
              </div>
            </div>
            <p class="mt-1 line-clamp-2 text-sm text-base-content/45">{{ project.description }}</p>
          </div>
      </button>
      </div>
    </div>

    <div class="rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)] backdrop-blur">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-base-content/40">Playback</p>
          <h3 class="mt-1 text-lg font-bold text-base-content">最近の再生</h3>
        </div>
        <span class="rounded-full bg-base-200 px-3 py-1 text-xs text-base-content/60">{{ playbackStore.state }}</span>
      </div>

      <ul class="mt-4 space-y-3">
        <li v-for="item in playbackStore.latestHistory" :key="item.id">
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-white px-3 py-3">
            <div>
              <strong class="text-sm font-bold text-base-content">{{ item.title }}</strong>
              <p class="mt-1 text-xs text-base-content/45">{{ item.playedAt }}</p>
            </div>
            <span class="text-xs text-base-content/60">{{ item.result }}</span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>