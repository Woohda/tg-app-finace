<script setup lang="ts">
/**
 * @module app/components/categories/CategoryBottomSheet
 * @fileoverview Выдвижная нижняя шторка (Bottom Sheet) для выбора категории
 * @description
 * Отображает список категорий с поиском, крупными эмодзи, выделением активного элемента.
 * Построена на базе унифицированного компонента `GlassBottomSheet`.
 */
import { cn } from "~/utils/cn";

export interface CategoryOption {
  id: string;
  name: string;
  icon?: string | null;
  type?: string;
}

withDefaults(
  defineProps<{
    isOpen?: boolean;
    categories: CategoryOption[];
    modelValue?: string;
    title?: string;
  }>(),
  {
    isOpen: false,
    modelValue: "",
    title: "Выберите категорию",
  },
);

const emit = defineEmits<{
  (e: "select", category: CategoryOption): void;
  (e: "close"): void;
}>();
</script>

<template>
  <GlassBottomSheet
    :is-open="isOpen"
    :items="categories"
    :model-value="modelValue"
    :title="title"
    search-placeholder="Поиск категории..."
    empty-text="Категории не найдены"
    @select="emit('select', $event)"
    @close="emit('close')"
  >
    <template #item="{ item: cat, selected }">
      <div class="flex items-center min-w-0 flex-1 mr-2">
        <div
          :class="
            cn(
              'size-8 rounded-full flex items-center justify-center text-sm shrink-0 mr-2 transition-colors glass-pill',
              selected ? 'text-text-accent' : 'text-text-primary',
            )
          "
        >
          {{ cat.icon || "🏷️" }}
        </div>
        <span class="text-[15px] font-medium text-left truncate flex-1">
          {{ cat.name }}
        </span>
      </div>
    </template>
  </GlassBottomSheet>
</template>
