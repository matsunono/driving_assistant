<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import RowActionMenu from '../components/common/RowActionMenu.vue'

import { useProjectStore } from '../stores/project'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const pendingDelete = ref<{ configId: string; configName: string } | null>(null)

const projectId = computed(() => String(route.params.projectId ?? ''))
const project = computed(() => projectStore.projects.find((item) => item.id === projectId.value) ?? null)

function createConfig() {
  if (!project.value) {
    return
  }

  const nextIndex = project.value.configs.length + 1
  const config = projectStore.createConfigForProject(projectId.value, `設定ファイル${nextIndex}`)

  if (config) {
    router.push(`/projects/${projectId.value}/configs/${config.id}`)
  }
}

function openConfig(configId: string) {
  router.push(`/projects/${projectId.value}/configs/${configId}`)
}

function toggleConfigEnabled(configId: string) {
  projectStore.toggleConfigEnabled(projectId.value, configId)
}

function requestDeleteConfig(configId: string, configName: string) {
  pendingDelete.value = { configId, configName }
}

function cancelDeleteConfig() {
  pendingDelete.value = null
}

function confirmDeleteConfig() {
  if (!pendingDelete.value) {
    return
  }

  projectStore.removeConfig(projectId.value, pendingDelete.value.configId)
  pendingDelete.value = null
}
</script>

<template>
  <section v-if="project" class="mx-auto flex w-full max-w-md flex-col gap-4">
    <div class="rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)] backdrop-blur">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm text-base-content/40">Files</p>
          <h2 class="mt-1 text-xl font-bold text-base-content">{{ project.name }}</h2>
          <p class="mt-1 text-sm text-base-content/45">設定ファイル一覧</p>
        </div>

        <button type="button" class="btn btn-neutral rounded-full px-4 text-sm font-bold shadow-sm" @click="createConfig">
          新規作成
        </button>
      </div>

      <div class="mt-4 space-y-3">
        <button
          v-for="config in project.configs"
          :key="config.id"
          type="button"
          class="flex w-full items-start gap-3 rounded-2xl border border-base-300 bg-white px-3 py-3 text-left"
          @click="openConfig(config.id)"
        >
          <span class="pt-1 text-base-content/70">
            <FontAwesomeIcon :icon="faStar" class="text-sm" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2">
              <strong class="truncate text-[15px] font-bold text-base-content">{{ config.name }}</strong>
              <div class="flex items-center gap-2">
                <RowActionMenu
                  menu-label="設定アクションを開く"
                  @edit="openConfig(config.id)"
                  @delete="requestDeleteConfig(config.id, config.name)"
                />
                <input
                  :checked="config.enabled"
                  type="checkbox"
                  class="toggle toggle-sm"
                  @click.stop
                  @change="toggleConfigEnabled(config.id)"
                />
              </div>
            </div>
            <p class="mt-1 text-sm text-base-content/45">{{ config.description }}</p>
          </div>
        </button>
      </div>
    </div>

    <ConfirmModal
      :open="Boolean(pendingDelete)"
      title="設定ファイルを削除しますか？"
      :message="pendingDelete ? `「${pendingDelete.configName}」を削除します。この操作は取り消せません。` : ''"
      confirm-label="はい"
      cancel-label="いいえ"
      @confirm="confirmDeleteConfig"
      @cancel="cancelDeleteConfig"
    />
  </section>

  <section v-else class="mx-auto max-w-md rounded-[28px] border border-base-300 bg-white/88 p-4 shadow-[0_18px_45px_rgba(28,24,19,0.12)]">
    <h2 class="text-lg font-bold text-base-content">プロジェクトが見つかりません</h2>
  </section>
</template>