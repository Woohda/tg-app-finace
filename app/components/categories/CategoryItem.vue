<script setup lang="ts">
/**
 * @module app/components/categories/CategoryItem
 * @fileoverview Компонент отображения отдельной категории.
 * @description
 * Отображает иконку и название категории.
 * По клику вызывает событие редактирования.
 * Свайп влево открывает кнопку удаления через `SwipeableRow`.
 */
interface Props {
  icon?: string;
  name: string;
  defaultIcon?: string;
}

withDefaults(defineProps<Props>(), {
  icon: undefined,
  defaultIcon: "💸",
});

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();
</script>

<template>
  <SwipeableRow
    role="button"
    tabindex="0"
    :aria-label="`Категория ${name}`"
    class="group category-item rounded-xl outline-none a11y-focus"
    content-class="category-content flex items-center justify-between p-3 bg-transparent border-b border-black/6 cursor-pointer active:opacity-80 group-last:border-none"
    @click="emit('edit')"
    @keydown.enter="emit('edit')"
    @keydown.space.prevent="emit('edit')"
    @delete="emit('delete')"
  >
    <div class="flex items-center gap-3 min-w-0">
      <div
        class="size-9 rounded-full glass-pill flex items-center justify-center text-lg shrink-0"
      >
        {{ icon || defaultIcon }}
      </div>
      <span class="w-full text-text-primary font-medium text-sm truncate">
        {{ name }}
      </span>
    </div>
  </SwipeableRow>
</template>

<style scoped></style>
