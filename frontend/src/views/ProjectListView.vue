<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import CreateProjectModal from '../components/feature/CreateProjectModal.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import RowActionMenu from '../components/common/RowActionMenu.vue'

import { useProjectStore } from '../stores/project'

const projectStore = useProjectStore()
const router = useRouter()
const pendingDelete = ref<{ projectId: string; projectName: string } | null>(null)
const pendingCreate = ref(false)

function openProject(projectId: string) {
  projectStore.selectProject(projectId)
  router.push(`/projects/${projectId}`)
}

function openCreateProject() {
  pendingCreate.value = true
}

function cancelCreateProject() {
  pendingCreate.value = false
}

function confirmCreateProject(payload: { name: string; description: string }) {
  const project = projectStore.createProject(payload.name, payload.description)
  pendingCreate.value = false
  openProject(project.id)
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
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm text-base-content/40">Projects</p>
          <h2 class="mt-1 text-2xl font-bold text-base-content">プロジェクト一覧</h2>
        </div>

        <button type="button" class="btn btn-neutral rounded-full px-4 text-sm font-bold shadow-sm" @click="openCreateProject">
          新規作成
        </button>
      </div>

      <div class="mt-4 space-y-3">
        <button
          v-for="project in projectStore.projects"
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
                  class="toggle toggle-sm "
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

    <CreateProjectModal
      :open="pendingCreate"
      @confirm="confirmCreateProject"
      @cancel="cancelCreateProject"
    />
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