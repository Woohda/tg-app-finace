<script setup lang="ts">
/**
 * @module app/components/shared/GlassInput
 * @fileoverview Универсальное поле ввода в стиле Glassmorphism
 * @description
 * Кастомный инпут для форм (сумма, название и др.). Поддерживает иконку слева,
 * кастомные placeholder и label. Имеет единый закругленный дизайн (glass-milky).
 */
import { computed } from "vue";
import type { Component } from "vue";
import { Input } from "~/components/ui/input";

const props = defineProps<{
  modelValue?: string | number | null;
  label?: string;
  placeholder?: string;
  type?: string;
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
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-bold text-text-primary pl-3">{{
      label
    }}</label>
    <div class="relative flex items-center">
      <div
        v-if="$slots.icon || icon"
        class="absolute left-3 flex items-center justify-center text-text-secondary pointer-events-none z-10"
      >
        <slot name="icon">
          <component
            :is="icon"
            v-if="typeof icon === 'object' || typeof icon === 'function'"
            class="size-5"
          />
          <span v-else class="font-bold text-lg text-text-primary">{{
            icon
          }}</span>
        </slot>
      </div>
      <Input
        v-model="value"
        :type="type"
        :step="step"
        :placeholder="placeholder"
        :class="[
          'bg-transparent glass-milky rounded-full px-5 py-5 text-text-primary font-medium text-base outline-none border-none focus-visible:ring-2 focus-visible:ring-text-accent',
          $slots.icon || icon ? 'pl-9' : '',
        ]"
      />
    </div>
  </div>
</template>
