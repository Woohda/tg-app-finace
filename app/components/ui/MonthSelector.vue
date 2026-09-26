<script setup lang="ts">
/**
 * @module app/components/ui/MonthSelector
 * @fileoverview Селектор месяца для навигации по отчетам.
 * @description
 * Отображает текущий выбранный месяц и год, предоставляет кнопки
 * для переключения на предыдущий и следующий месяц.
 */
import { ChevronLeft, ChevronRight } from "@lucide/vue";

defineProps<{
  date: Date;
}>();

const emit = defineEmits<{
  (e: "prev" | "next"): void;
}>();

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
</script>

<template>
  <div
    class="flex items-center justify-between glass-pill rounded-3xl px-2 py-1 w-full mx-auto"
  >
    <button
      type="button"
      aria-label="Предыдущий месяц"
      class="p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer active:scale-95 outline-none a11y-focus"
      @click="emit('prev')"
    >
      <ChevronLeft class="w-6 h-6" />
    </button>
    <div class="font-bold text-text-primary flex gap-2" aria-live="polite">
      <span>{{ monthNames[date.getMonth()] }}</span>
      <span>{{ date.getFullYear() }}</span>
    </div>
    <button
      type="button"
      aria-label="Следующий месяц"
      class="p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer active:scale-95 outline-none a11y-focus"
      @click="emit('next')"
    >
      <ChevronRight class="w-6 h-6" />
    </button>
  </div>
</template>
