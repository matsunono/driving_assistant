<script setup lang="ts">
import { faEllipsis } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = withDefaults(
  defineProps<{
    menuLabel?: string
    editLabel?: string
    deleteLabel?: string
  }>(),
  {
    menuLabel: '行アクションを開く',
    editLabel: '編集',
    deleteLabel: '削除',
  },
)

const emit = defineEmits<{
  edit: []
  delete: []
}>()

function closeMenu(trigger: EventTarget | null) {
  const target = trigger as HTMLElement | null
  target?.closest('details')?.removeAttribute('open')
}

function onEdit(event: Event) {
  closeMenu(event.currentTarget)
  emit('edit')
}

function onDelete(event: Event) {
  closeMenu(event.currentTarget)
  emit('delete')
}
</script>

<template>
  <details class="dropdown dropdown-end" @click.stop>
    <summary
      class="btn btn-square btn-sm border-none bg-neutral text-neutral-content shadow-none"
      :aria-label="props.menuLabel"
      @click.stop
    >
      <FontAwesomeIcon :icon="faEllipsis" />
    </summary>
    <ul class="menu dropdown-content z-[30] mt-2 w-28 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
      <li>
        <button type="button" class="text-sm" @click.stop="onEdit">{{ props.editLabel }}</button>
      </li>
      <li>
        <button type="button" class="text-sm text-error" @click.stop="onDelete">{{ props.deleteLabel }}</button>
      </li>
    </ul>
  </details>
</template>