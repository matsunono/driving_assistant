<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    confirmLabel?: string
    cancelLabel?: string
    projectName?: string
    description?: string
  }>(),
  {
    title: 'プロジェクト新規作成',
    confirmLabel: '作成',
    cancelLabel: 'キャンセル',
    projectName: '',
    description: '',
  },
)

const emit = defineEmits<{
  confirm: [payload: { name: string; description: string }]
  cancel: []
}>()

const name = ref(props.projectName)
const description = ref(props.description)

const canSubmit = computed(() => name.value.trim().length > 0)

watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = props.projectName
      description.value = props.description
    }
  },
)

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('cancel')
  }
}

function onSubmit() {
  if (!canSubmit.value) {
    return
  }

  emit('confirm', {
    name: name.value.trim(),
    description: description.value.trim(),
  })
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" @click="onBackdropClick">
    <div class="w-full max-w-sm rounded-3xl border border-base-300 bg-base-100 p-5 shadow-2xl">
      <h3 class="text-lg font-bold text-base-content">{{ props.title }}</h3>

      <div class="mt-4 space-y-4">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content">プロジェクト名</span>
          <input v-model="name" type="text" class="input input-bordered w-full rounded-2xl" placeholder="例: ドライブ用ヌヌちゃん" />
        </label>

        <label class="block space-y-2">
          <span class="text-sm font-medium text-base-content">概要</span>
          <textarea
            v-model="description"
            class="textarea textarea-bordered min-h-24 w-full rounded-2xl"
            placeholder="例: 運転中の休憩リマインドをまとめる"
          />
        </label>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" @click="emit('cancel')">{{ props.cancelLabel }}</button>
        <button type="button" class="btn btn-neutral btn-sm text-white" :disabled="!canSubmit" @click="onSubmit">
          {{ props.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>