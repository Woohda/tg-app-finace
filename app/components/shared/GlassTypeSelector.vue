<script setup lang="ts">
/**
 * @module app/components/shared/GlassTypeSelector
 * @fileoverview Селектор типа транзакции (Доход / Расход)
 * @description
 * Компонент на базе RadioGroup из `reka-ui`. Представляет собой две большие
 * стеклянные кнопки с иконками и текстом, позволяющие выбрать тип операции.
 */
import { RadioGroupRoot, RadioGroupItem } from "reka-ui";
import { BanknoteArrowUp, BanknoteArrowDown } from "@lucide/vue";

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();
</script>

<template>
  <RadioGroupRoot
    :model-value="modelValue"
    class="flex items-center justify-center w-5/6 mx-auto"
    aria-label="Тип транзакции"
    @update:model-value="emit('update:modelValue', $event as string)"
  >
    <!-- Доход -->
    <RadioGroupItem
      value="income"
      class="group relative flex-1 flex flex-col items-center justify-center gap-px py-1.5 rounded-4xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] outline-none cursor-pointer select-none a11y-focus bg-transparent!"
      :class="[
        modelValue === 'income'
          ? 'z-20 scale-100 opacity-100 shadow-[0_4px_20px_rgba(225,29,72,0.3)]! text-text-accent blur-0'
          : 'z-10 scale-90 opacity-80 text-text-secondary blur-[1px] hover:blur-0 hover:opacity-90',
      ]"
    >
      <!-- Фон (общий для активного и неактивного) -->
      <div
        class="absolute inset-0 rounded-4xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] -z-10"
        :class="[
          modelValue === 'income'
            ? 'glass-pill'
            : 'bg-white/20 border border-transparent backdrop-blur-sm',
        ]"
      />
      <BanknoteArrowUp
        class="relative z-10 size-9 transition-colors duration-500"
        stroke-width="1.5"
      />
      <span class="relative z-10 text-sm text-text-secondary">Доход</span>
    </RadioGroupItem>

    <!-- Расход -->
    <RadioGroupItem
      value="expense"
      class="group relative flex-1 flex flex-col items-center justify-center gap-px py-1.5 rounded-4xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] outline-none cursor-pointer select-none -ml-4 a11y-focus bg-transparent!"
      :class="[
        modelValue === 'expense'
          ? 'z-20 scale-100 opacity-100 shadow-[0_4px_20px_rgba(225,29,72,0.3)]! text-text-accent blur-0'
          : 'z-10 scale-90 opacity-80 text-text-secondary blur-[1px] hover:blur-0 hover:opacity-90',
      ]"
    >
      <!-- Фон (общий для активного и неактивного) -->
      <div
        class="absolute inset-0 rounded-4xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] -z-10"
        :class="[
          modelValue === 'expense'
            ? 'glass-pill'
            : 'bg-white/20 border border-transparent backdrop-blur-sm',
        ]"
      />
      <BanknoteArrowDown
        class="relative z-10 size-9 transition-colors duration-500"
        stroke-width="1.5"
      />
      <span class="relative z-10 text-sm text-text-secondary">Трата</span>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
