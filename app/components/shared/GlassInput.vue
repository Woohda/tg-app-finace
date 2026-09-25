<script setup lang="ts">
/**
 * @module app/components/shared/GlassInput
 * @fileoverview Поле ввода в стиле Glassmorphism.
 * @description
 * Обертка над базовым компонентом `Input`, добавляющая лэйбл, иконки (start/end)
 * и стилизацию (полупрозрачный фон, мягкие тени).
 */
import { computed, ref } from "vue";
import type { Component } from "vue";
import { Input } from "~/components/ui/input";

const props = defineProps<{
  modelValue?: string | number | null;
  label?: string;
  placeholder?: string;
  type?: string;
  inputmode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  icon?: string | object | Component;
  step?: string | number;
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void;
}>();

const value = computed({
  get: () => props.modelValue ?? "",
  set: (val) => emits("update:modelValue", val),
});

const isFocused = ref(false);
const inputCompRef = ref<InstanceType<typeof Input> | null>(null);

const focus = () => {
  if (inputCompRef.value?.inputRef) {
    inputCompRef.value.inputRef.focus();
  }
};

const handleFocus = (e: FocusEvent) => {
  isFocused.value = true;
  const inputEl = e.target as HTMLElement | null;
  if (!inputEl) return;

  // Ищем ближайший скроллируемый контейнер модалки (GlassCard), избегая скролла window
  const scrollContainer = inputEl.closest<HTMLElement>(
    "[data-modal-card], .overflow-y-auto",
  );

  if (scrollContainer) {
    setTimeout(() => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const inputRect = inputEl.getBoundingClientRect();

      // Центрируем поле в верхней трети видимого контейнера над клавиатурой
      const relativeTop = inputRect.top - containerRect.top;
      const targetScroll =
        scrollContainer.scrollTop + relativeTop - containerRect.height * 0.35;

      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }, 180);
  }
};

defineExpose({ focus });
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-xs font-bold text-text-primary pl-3">{{
      label
    }}</label>
    <div
      :class="[
        'relative flex items-center group transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] transform-gpu glass-pill rounded-full',
        value || isFocused ? 'opacity-100' : 'opacity-70 hover:opacity-100',
      ]"
    >
      <div
        v-if="$slots.icon || icon"
        class="absolute z-10 left-3 flex items-center justify-center text-text-secondary pointer-events-none transition-colors duration-500"
      >
        <slot name="icon">
          <component
            :is="icon"
            v-if="typeof icon === 'object' || typeof icon === 'function'"
            class="size-5"
          />
          <span v-else class="font-bold text-lg">{{ icon }}</span>
        </slot>
      </div>
      <Input
        ref="inputCompRef"
        v-model="value"
        :type="type"
        :inputmode="inputmode"
        :step="step"
        :placeholder="placeholder"
        :class="[
          'relative z-10 bg-transparent rounded-full px-5 text-text-primary font-medium outline-none border-none transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] transform-gpu',
          $slots.icon || icon ? 'pl-10' : '',
          type === 'date' ? 'py-0 min-h-10 appearance-none leading-normal' : '',
          'focus:shadow-[0_4px_20px_rgba(225,29,72,0.3)]!',
        ]"
        @focus="handleFocus"
        @blur="isFocused = false"
      />
    </div>
  </div>
</template>
