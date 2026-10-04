<script setup lang="ts">
/**
 * @module app/components/ui/MonthSelector
 * @fileoverview Селектор месяца для навигации по отчетам и аналитике
 * @description
 * Отображает текущий выбранный месяц и год, предоставляет кнопки для переключения
 * на предыдущий и следующий месяц с поддержкой блокировки перехода в будущее (`disableNext`).
 * ---
 * ### Логика работы:
 * 1. Форматирует переданную дату `date` в название месяца на русском языке и год.
 * 2. Генерирует события `prev` и `next` при клике по стрелкам навигации.
 * 3. Блокирует кнопку перехода вперед, если установлен флаг `disableNext`.
 */
import { ChevronLeft, ChevronRight } from "@lucide/vue";

defineProps<{
  date: Date;
  disableNext?: boolean;
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
      :disabled="disableNext"
      class="p-2 transition-colors outline-none a11y-focus"
      :class="
        disableNext
          ? 'opacity-30 cursor-not-allowed text-text-secondary'
          : 'text-text-secondary hover:text-text-primary cursor-pointer active:scale-95'
      "
      @click="!disableNext && emit('next')"
    >
      <ChevronRight class="w-6 h-6" />
    </button>
  </div>
</template>
