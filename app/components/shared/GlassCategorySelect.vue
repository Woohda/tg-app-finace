<script setup lang="ts">
/**
 * @module app/components/shared/GlassCategorySelect
 * @fileoverview Селект выбора категории в стиле Glassmorphism (кнопка-триггер)
 * @description
 * Отображает выбранную категорию с эмодзи или плейсхолдер.
 * По клику открывает вынесенную шторку `CategoryBottomSheet`.
 */
import { computed, ref } from "vue";
import type { Component } from "vue";
import { ChevronDown } from "@lucide/vue";
import { cn } from "~/utils/cn";
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

const emits = defineEmits<{
  (e: "update:modelValue", payload: string): void;
}>();

const { isKeyboardOpen } = useKeyboardViewport();
const isSheetOpen = ref(false);

const selectedCategory = computed(() =>
  props.categories.find((c) => c.id === props.modelValue),
);

const handleSelect = (category: CategoryOption) => {
  emits("update:modelValue", category.id);
  isSheetOpen.value = false;
};

const openSheet = () => {
  if (props.disabled) return;
  // Снимаем фокус с любого активного инпута, чтобы клавиатура закрылась до показа шторки
  if (
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }
  // Если клавиатура открыта, даем ей время скрыться перед началом плавной анимации шторки
  if (isKeyboardOpen.value) {
    setTimeout(() => {
      isSheetOpen.value = true;
    }, 220);
  } else {
    isSheetOpen.value = true;
  }
};
</script>

<template>
  <div class="relative w-full flex flex-col gap-1">
    <!-- Лейбл поля (если передан) -->
    <label v-if="label" class="text-xs font-bold text-text-primary pl-2">
      {{ label }}
    </label>

    <!-- Кнопка-триггер селектора -->
    <button
      type="button"
      :disabled="disabled"
      :class="
        cn(
          'relative w-full text-left flex items-center justify-between rounded-full px-4 py-2.5 glass-pill',
          'transition-all duration-300 transform-gpu cursor-pointer',
          'focus:outline-none a11y-focus',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'active:scale-[0.99] hover:bg-white/50',
          selectedCategory ? 'opacity-100' : 'opacity-80',
        )
      "
      @click="openSheet"
    >
      <div class="flex items-center min-w-0 flex-1 mr-2">
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
          class="text-base shrink-0 mr-2 pt-1 opacity-60 leading-none select-none"
        >
          🏷️
        </span>

        <span
          :class="
            cn(
              'font-medium text-sm truncate',
              selectedCategory ? 'text-text-primary' : 'text-text-secondary',
            )
          "
        >
          {{ selectedCategory ? selectedCategory.name : placeholder }}
        </span>
      </div>

      <ChevronDown
        :class="
          cn(
            'size-5 text-text-primary shrink-0 transition-transform duration-300',
            isSheetOpen && 'rotate-180 text-text-accent',
          )
        "
      />
    </button>

    <!-- Вынесенная шторка категорий -->
    <CategoryBottomSheet
      :is-open="isSheetOpen"
      :categories="categories"
      :model-value="modelValue"
      @select="handleSelect"
      @close="isSheetOpen = false"
    />
  </div>
</template>
