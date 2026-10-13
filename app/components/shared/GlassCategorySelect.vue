<script setup lang="ts">
/**
 * @module app/components/shared/GlassCategorySelect
 * @fileoverview Селект выбора категории расходов/доходов в стиле Glassmorphism
 * @description
 * Отображает выбранную категорию с эмодзи или плейсхолдер.
 * Использует базовый компонент `GlassSelect` и шторку `CategoryBottomSheet`.
 * ---
 * ### Логика работы:
 * 1. Определение выбранной категории по `modelValue` из переданного списка категорий.
 * 2. Отрисовка названия и эмодзи/иконки категории в кнопке-триггере.
 * 3. Открытие нижней шторки `CategoryBottomSheet` и передача выбранного ID через `update:modelValue`.
 */
import { computed, ref } from "vue";
import type { Component } from "vue";
import type { CategoryOption } from "~/components/categories/CategoryBottomSheet.vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    categories: CategoryOption[];
    label?: string;
    placeholder?: string;
    icon?: string | object | Component;
    disabled?: boolean;
  }>(),
  {
    modelValue: "",
    label: undefined,
    placeholder: "Выберите категорию",
    icon: undefined,
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", payload: string): void;
}>();

const isSheetOpen = ref(false);

const selectedCategory = computed(() =>
  props.categories.find((c) => c.id === props.modelValue),
);

const handleSelect = (category: CategoryOption) => {
  emit("update:modelValue", category.id);
  isSheetOpen.value = false;
};
</script>

<template>
  <GlassSelect
    v-model:is-open="isSheetOpen"
    :label="label"
    :placeholder="placeholder"
    :disabled="disabled"
    :selected="!!selectedCategory"
    :display-text="selectedCategory?.name"
  >
    <template #icon>
      <!-- Иконка или эмодзи выбранной категории -->
      <span
        v-if="selectedCategory?.icon"
        class="text-base shrink-0 mr-2 leading-none select-none"
      >
        {{ selectedCategory.icon }}
      </span>

      <!-- Пользовательская иконка или слот -->
      <div
        v-else-if="$slots.icon || icon"
        class="shrink-0 mr-2 flex items-center justify-center text-text-secondary [&>svg]:size-3 [&>svg]:w-3 [&>svg]:h-3"
      >
        <slot name="icon">
          <component :is="icon" v-if="icon" class="size-3" />
        </slot>
      </div>

      <!-- Иконка-заглушка -->
      <span
        v-else
        class="mt-px text-lg shrink-0 mr-2 opacity-60 leading-none select-none"
      >
        🏷️
      </span>
    </template>

    <template #sheet="{ isOpen, close }">
      <CategoryBottomSheet
        :is-open="isOpen"
        :categories="categories"
        :model-value="modelValue"
        @select="handleSelect"
        @close="close"
      />
    </template>
  </GlassSelect>
</template>
