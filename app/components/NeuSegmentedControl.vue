<script setup lang="ts" generic="T extends string = string">
import { cn } from "~/utils";

/**
 * @module app/components/NeuSegmentedControl
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
  <div
    class="flex items-center p-1.25 justify-between bg-milky rounded-full shadow-neu-inner"
    :class="size === 'sm' ? '' : 'w-full'"
  >
    <UiButton
      v-for="opt in options"
      :key="getOptionId(opt)"
      type="button"
      variant="ghost"
      :class="
        cn(
          'font-bold rounded-full transition-all duration-200 cursor-pointer text-center select-none shadow-none h-auto focus-visible:ring-0',
          size === 'sm' ? 'px-3 py-1 text-xs' : 'flex-1 py-1.5 text-sm',
          modelValue === getOptionId(opt)
            ? 'neu-sunset-glow text-white hover:text-white'
            : 'text-text-secondary hover:text-text-primary hover:bg-transparent bg-transparent',
        )
      "
      @click="selectOption(getOptionId(opt))"
    >
      {{ getOptionLabel(opt) }}
    </UiButton>
  </div>
</template>
