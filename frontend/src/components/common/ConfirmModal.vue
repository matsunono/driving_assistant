<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  {
    title: '確認',
    message: '',
    confirmLabel: 'はい',
    cancelLabel: 'キャンセル',
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('cancel')
  }
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" @click="onBackdropClick">
    <div class="w-full max-w-sm rounded-3xl border border-base-300 bg-base-100 p-5 shadow-2xl">
      <h3 class="text-lg font-bold text-base-content">{{ props.title }}</h3>
      <p class="mt-2 text-sm text-base-content/65">{{ props.message }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" @click="emit('cancel')">{{ props.cancelLabel }}</button>
        <button type="button" class="btn btn-error btn-sm text-white" @click="emit('confirm')">{{ props.confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>