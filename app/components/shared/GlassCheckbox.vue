<script setup lang="ts">
/**
 * @module app/components/shared/GlassCheckbox
 * @fileoverview Кастомный чекбокс в стиле Glassmorphism
 * @description
 * Доступный переключатель состояния (флажок) со стеклянным фоном
 * и плавно появляющейся акцентной красной галочкой без смены фона плашки.
 * ---
 * ### Логика работы:
 * 1. Поддерживает `v-model` (boolean или массив значений) или отдельный prop `checked`.
 * 2. Обеспечивает нативную доступность через скрытый `input[type="checkbox"]` и фокус по Tab.
 * 3. Анимирует появление красной иконки галочки при выборе.
 */
import { computed } from "vue";
import type { HTMLAttributes } from "vue";
import { Check } from "@lucide/vue";
import { cn } from "~/utils/cn";

interface Props {
  modelValue?: boolean | (string | number)[];
  value?: string | number;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  id?: string;
  class?: HTMLAttributes["class"];
  size?: "sm" | "default" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  value: undefined,
  checked: undefined,
  disabled: false,
  label: undefined,
  id: undefined,
  class: undefined,
  size: "default",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean | (string | number)[]): void;
  (e: "change", value: boolean): void;
}>();

const isChecked = computed(() => {
  if (Array.isArray(props.modelValue) && props.value !== undefined) {
    return props.modelValue.includes(props.value);
  }
  if (typeof props.modelValue === "boolean") {
    return props.modelValue;
  }
  return Boolean(props.checked);
});

const handleChange = (event: Event) => {
  if (props.disabled) return;
  const target = event.target as HTMLInputElement;
  const nextChecked = target.checked;

  if (Array.isArray(props.modelValue) && props.value !== undefined) {
    const nextArr = [...props.modelValue];
    if (nextChecked) {
      if (!nextArr.includes(props.value)) nextArr.push(props.value);
    } else {
      const idx = nextArr.indexOf(props.value);
      if (idx !== -1) nextArr.splice(idx, 1);
    }
    emit("update:modelValue", nextArr);
  } else {
    emit("update:modelValue", nextChecked);
  }

  emit("change", nextChecked);
};
</script>

<template>
  <label
    :class="
      cn(
        'inline-flex items-center gap-2.5 cursor-pointer select-none transition-opacity duration-200 min-w-0',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        props.class,
      )
    "
  >
    <!-- Скрытый нативный чекбокс для доступности (a11y) и фокуса по клавиатуре -->
    <input
      :id="id"
      type="checkbox"
      class="sr-only peer"
      :checked="isChecked"
      :disabled="disabled"
      :value="value"
      @change="handleChange"
    />

    <!-- Кастомный визуальный бокс чекбокса -->
    <div
      :class="
        cn(
          'relative flex items-center justify-center shrink-0 transition-all duration-200 ease-out',
          'glass-pill active:scale-95 a11y-focus',
          // Размеры
          size === 'sm' && 'size-5.5 rounded-full',
          size === 'default' && 'size-6.5 rounded-full',
          size === 'lg' && 'size-7.5 rounded-full',
          isChecked ? 'border-text-accent/30' : 'border-white/60',
        )
      "
    >
      <Check
        :stroke-width="2"
        :class="
          cn(
            'transition-all duration-200 ease-out text-text-accent',
            size === 'sm' && 'size-3',
            size === 'default' && 'size-4',
            size === 'lg' && 'size-5',
            isChecked ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
          )
        "
      />
    </div>

    <!-- Текстовый лейбл или слот -->
    <span
      v-if="label || $slots.default"
      class="text-sm font-semibold text-text-primary min-w-0 truncate"
    >
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>
