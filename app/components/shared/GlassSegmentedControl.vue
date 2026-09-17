<script setup lang="ts" generic="T extends string = string">
/**
 * @module app/components/GlassSegmentedControl
 * @fileoverview Неоморфный переключатель сегментов (Segmented Control / Pill Switcher)
 * @description
 * Вдавленная неоморфная плашка с кнопками UiButton.
 * Активный элемент подсвечивается градиентом sunset-glow.
 * Поддерживает размеры 'sm' (для компактных зон, например внутри датчика)
 * и 'md' (полноразмерный для списков и фильтров).
 */

export interface SegmentOption<V extends string = string> {
  id: V;
  label: string;
}

interface Props {
  modelValue: T;
  options: Array<SegmentOption<T> | T>;
  size?: "sm" | "md";
}

withDefaults(defineProps<Props>(), {
  size: "md",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: T): void;
}>();

function getOptionId(opt: SegmentOption<T> | T): T {
  return typeof opt === "object" ? opt.id : opt;
}

function getOptionLabel(opt: SegmentOption<T> | T): string {
  return typeof opt === "object" ? opt.label : opt;
}

function selectOption(id: T) {
  emit("update:modelValue", id);
}
</script>

<template>
  <!-- Контейнер с flex, выравнивающий элементы в центре -->
  <div class="flex items-center justify-center">
    <GlassButton
      v-for="(opt, index) in options"
      :key="getOptionId(opt)"
      variant="soft"
      type="button"
      class="relative rounded-full flex items-center justify-center cursor-pointer select-none transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
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
        class="absolute inset-0 rounded-full transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] -z-10"
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
