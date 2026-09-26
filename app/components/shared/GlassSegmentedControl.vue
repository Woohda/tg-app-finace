<script setup lang="ts" generic="T extends string = string">
/**
 * @module app/components/shared/GlassSegmentedControl
 * @fileoverview Стеклянный переключатель сегментов (Segmented Control / Pill Switcher)
 * @description
 * Компонент переключения вкладок/сегментов в стиле Glassmorphism.
 * Поддерживает WAI-ARIA роли tablist и tab, а также навигацию стрелками клавиатуры
 * (ArrowLeft / ArrowRight / ArrowUp / ArrowDown, Home, End) с циклическим переключением.
 * Поддерживает размеры 'sm' (для компактных зон) и 'md' (для списков и фильтров).
 * ---
 * ### Логика работы:
 * 1. Синхронизирует активное состояние с `modelValue` через событие `update:modelValue`.
 * 2. Обеспечивает паттерн Roving Tabindex: активный таб имеет `tabindex="0"`, остальные — `-1`.
 * 3. При нажатии стрелок переключает активный таб и переносит на него DOM-фокус.
 */
import { ref, nextTick } from "vue";

export interface SegmentOption<V extends string = string> {
  id: V;
  label: string;
}

interface Props {
  modelValue: T;
  options: Array<SegmentOption<T> | T>;
  size?: "sm" | "md";
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: T): void;
}>();

const containerRef = ref<HTMLElement | null>(null);

function getOptionId(opt: SegmentOption<T> | T): T {
  return typeof opt === "object" ? opt.id : opt;
}

function getOptionLabel(opt: SegmentOption<T> | T): string {
  return typeof opt === "object" ? opt.label : opt;
}

function getOptionIndex(val: T): number {
  return props.options.findIndex((opt) => getOptionId(opt) === val);
}

function focusButton(index: number) {
  nextTick(() => {
    const buttons =
      containerRef.value?.querySelectorAll<HTMLButtonElement>("button");
    if (buttons && buttons[index]) {
      buttons[index].focus();
    }
  });
}

function selectOption(id: T, shouldFocus = false) {
  emit("update:modelValue", id);
  if (shouldFocus) {
    const index = getOptionIndex(id);
    if (index !== -1) {
      focusButton(index);
    }
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (props.options.length === 0) return;

  const currentIndex = getOptionIndex(props.modelValue);
  let nextIndex = currentIndex !== -1 ? currentIndex : 0;

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    nextIndex = (currentIndex + 1) % props.options.length;
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    nextIndex =
      (currentIndex - 1 + props.options.length) % props.options.length;
  } else if (e.key === "Home") {
    e.preventDefault();
    nextIndex = 0;
  } else if (e.key === "End") {
    e.preventDefault();
    nextIndex = props.options.length - 1;
  } else {
    return;
  }

  const nextOption = props.options[nextIndex];
  if (!nextOption) return;

  selectOption(getOptionId(nextOption), true);
}
</script>

<template>
  <!-- Контейнер с flex, выравнивающий элементы в центре -->
  <div
    ref="containerRef"
    class="flex items-center justify-center"
    role="tablist"
    @keydown="onKeyDown"
  >
    <GlassButton
      v-for="(opt, index) in options"
      :key="getOptionId(opt)"
      variant="soft"
      type="button"
      role="tab"
      :aria-selected="modelValue === getOptionId(opt)"
      :tabindex="modelValue === getOptionId(opt) ? 0 : -1"
      class="relative rounded-full flex items-center justify-center cursor-pointer select-none transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      :class="[
        // Размеры
        size === 'sm' ? 'px-5 py-1.25 text-xs' : 'px-7 py-1.5 text-sm',
        'h-auto',
        // Нахлест соседних карточек (кроме первой)
        index > 0 ? '-ml-5' : '',

        // Стили для Активного и Неактивного состояния
        modelValue === getOptionId(opt)
          ? 'z-20 scale-100 opacity-100 shadow-[0_4px_20px_rgba(225,29,72,0.3)]! text-text-primary blur-0'
          : 'z-10 scale-90 opacity-80 text-text-secondary blur-[1px] hover:blur-0 hover:opacity-90',
      ]"
      @click="selectOption(getOptionId(opt))"
    >
      <!-- Фон (общий для активного и неактивного) -->
      <div
        class="absolute inset-0 rounded-full transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] -z-10"
        :class="[
          modelValue === getOptionId(opt)
            ? 'glass-pill'
            : 'bg-white/20 border border-transparent backdrop-blur-md',
        ]"
      />
      <span
        class="relative z-10 font-bold tracking-wide whitespace-nowrap transition-colors duration-300"
        style="font-family: var(--font-sans)"
      >
        {{ getOptionLabel(opt) }}
      </span>
    </GlassButton>
  </div>
</template>
