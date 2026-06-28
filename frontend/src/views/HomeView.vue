<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import RowActionMenu from '../components/common/RowActionMenu.vue'

import { usePlaybackStore } from '../stores/playback'
import { useProjectStore } from '../stores/project'

const projectStore = useProjectStore()
const playbackStore = usePlaybackStore()
const router = useRouter()

function formatPlayedAt(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function resultLabel(result: 'success' | 'skipped' | 'failed') {
  if (result === 'success') return '✓ 成功'
  if (result === 'skipped') return '— スキップ'
  return '✗ 失敗'
}

function resultClass(result: 'success' | 'skipped' | 'failed') {
  if (result === 'success') return 'text-success'
  if (result === 'skipped') return 'text-base-content/50'
  return 'text-error'
}

const recentProjects = computed(() => projectStore.projects.slice(0, 6))
const pendingDelete = ref<{ projectId: string; projectName: string } | null>(null)

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

function requestDeleteProject(projectId: string, projectName: string) {
  pendingDelete.value = { projectId, projectName }
}

function cancelDeleteProject() {
  pendingDelete.value = null
}

function confirmDeleteProject() {
  if (!pendingDelete.value) {
    return
  }

  projectStore.removeProject(pendingDelete.value.projectId)
  pendingDelete.value = null
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
                <RowActionMenu
                  menu-label="プロジェクトアクションを開く"
                  @edit="editProject(project.id)"
                  @delete="requestDeleteProject(project.id, project.name)"
                />
                <input
                  :checked="project.enabled"
                  type="checkbox"
                  class="toggle toggle-sm"
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
        <span class="rounded-full bg-base-200 px-3 py-1 text-xs text-base-content/60">
          {{ playbackStore.state }}
        </span>
      </div>

      <p v-if="playbackStore.latestHistory.length === 0" class="mt-4 text-sm text-base-content/45">
        まだ再生履歴がありません
      </p>

      <ul v-else class="mt-4 space-y-2">
        <li v-for="item in playbackStore.latestHistory" :key="item.id">
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-white px-3 py-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-base-content">{{ item.title }}</p>
              <p class="mt-0.5 text-xs text-base-content/45">{{ formatPlayedAt(item.playedAt) }}</p>
            </div>
            <span class="shrink-0 text-xs font-semibold" :class="resultClass(item.result)">{{ resultLabel(item.result) }}</span>
          </div>
        </li>
      </ul>
    </div>

    <ConfirmModal
      :open="Boolean(pendingDelete)"
      title="プロジェクトを削除しますか？"
      :message="pendingDelete ? `「${pendingDelete.projectName}」を削除します。この操作は取り消せません。` : ''"
      confirm-label="はい"
      cancel-label="いいえ"
      @confirm="confirmDeleteProject"
      @cancel="cancelDeleteProject"
    />
  </section>
</template>