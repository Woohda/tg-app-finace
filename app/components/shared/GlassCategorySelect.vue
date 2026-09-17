<script setup lang="ts">
/**
 * @module app/components/shared/GlassCategorySelect
 * @fileoverview Выпадающий список категорий в стиле Glassmorphism
 * @description
 * Селект для выбора категории (иконка + название). Использует нативный `select`
 * стилизованный под общую дизайн-систему (glass-milky). Применяется в модальных
 * окнах и формах добавления/редактирования транзакций.
 */
import { computed, ref } from "vue";
import type { Component } from "vue";

interface CategoryOption {
  id: string;
  name: string;
  icon?: string | null;
}

const props = defineProps<{
  modelValue?: string;
  categories: CategoryOption[];
  icon?: string | object | Component;
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string): void;
}>();

const value = computed({
  get: () => props.modelValue || "",
  set: (val) => emits("update:modelValue", val),
});

const isFocused = ref(false);

const handleFocus = (e: FocusEvent) => {
  isFocused.value = true;
  setTimeout(() => {
    (e.target as HTMLElement)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 300);
};
</script>

<template>
  <div
    :class="[
      'relative w-full group transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] transform-gpu',
      value || isFocused ? 'opacity-100' : 'opacity-70 hover:opacity-100',
    ]"
  >
    <!-- Активный фон (овал) -->
    <div class="absolute inset-0 glass-pill rounded-full pointer-events-none" />

    <div
      v-if="$slots.icon"
      class="absolute z-10 left-3 flex items-center justify-center pointer-events-none transition-colors duration-500"
      :class="[
        value
          ? 'text-text-primary'
          : isFocused
            ? 'text-text-primary/70'
            : 'text-text-secondary',
      ]"
    >
      <slot name="icon">
        <component :is="icon" v-if="icon" class="size-5" />
      </slot>
    </div>

    <select
      v-model="value"
      :class="[
        'relative z-10 bg-transparent w-full rounded-full px-5 py-2.5 text-text-primary font-medium text-base outline-none transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] transform-gpu',
        'border-transparent appearance-none text-ellipsis overflow-hidden whitespace-nowrap a11y-focus',
        'focus:shadow-[0_4px_20px_rgba(225,29,72,0.3)]!',
        value ? 'text-text-primary' : 'text-text-secondary',
        $slots.icon || icon ? 'pl-10 pr-10' : 'pr-10',
      ]"
      @focus="handleFocus"
      @blur="isFocused = false"
    >
      <option value="" disabled>Категория</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
        <template v-if="cat.icon">{{ cat.icon }}&nbsp;&nbsp;</template
        >{{ cat.name }}
      </option>
    </select>
    <div
      class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-sm transition-colors duration-500 group-focus-within:text-text-accent"
      :class="isFocused ? 'text-text-accent' : 'text-text-secondary'"
    >
      ▼
    </div>
  </div>
</template>
