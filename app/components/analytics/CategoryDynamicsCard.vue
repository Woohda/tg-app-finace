<script setup lang="ts">
/**
 * @module app/components/analytics/CategoryDynamicsCard
 * @fileoverview Карточка графика динамики расходов по категории
 * @description
 * Отображает столбчатую диаграмму динамики трат по выбранной категории:
 * - заголовок с бейджем архивного периода;
 * - рендеринг столбчатого графика через `AnalyticsBarChart`;
 * - переключатель между текущим и сравнительным периодом с иконками состояния.
 * ---
 * ### Логика работы:
 * 1. Получает массивы точек графика `chartData` и `prevChartData`, а также статус выбранного периода.
 * 2. Отрисовывает `AnalyticsBarChart` с динамическим ключом для плавного перезапуска анимации.
 * 3. При поддержке переключения отображает интерактивную кнопку смены периода трат.
 */
import type { ChartDataPoint } from "~/utils/analytics";
import { RotateCcw, CalendarClock } from "@lucide/vue";
import GlassCard from "~/components/shared/GlassCard.vue";
import AnalyticsBarChart from "./AnalyticsBarChart.vue";

interface Props {
  chartData: ChartDataPoint[];
  prevChartData: ChartDataPoint[];
  isPrevPeriod: boolean;
  prevPeriodName: string;
  prevPeriodButtonName: string;
  canTogglePeriod?: boolean;
}

withDefaults(defineProps<Props>(), {
  canTogglePeriod: false,
});

const emit = defineEmits<{
  (e: "togglePeriod"): void;
}>();
</script>

<template>
  <GlassCard class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <h2
        class="text-text-secondary font-bold text-sm uppercase tracking-wider"
      >
        Динамика расходов по категории
      </h2>
      <span
        v-if="isPrevPeriod"
        class="text-[10px] text-center font-medium px-2.5 py-0.5 rounded-full bg-accent-start/10 text-text-accent tracking-wide transition-all w-fit"
      >
        {{ prevPeriodName }}
      </span>
    </div>

    <AnalyticsBarChart
      :key="isPrevPeriod ? 'prev' : 'current'"
      :data="isPrevPeriod ? prevChartData : chartData"
    />

    <button
      v-if="canTogglePeriod"
      type="button"
      class="self-center flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-full glass-pill text-text-accent hover:text-text-primary text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer a11y-focus"
      @click="emit('togglePeriod')"
    >
      <component
        :is="isPrevPeriod ? RotateCcw : CalendarClock"
        class="w-3.5 h-3.5"
      />
      <span>
        {{
          isPrevPeriod
            ? "Вернуться обратно"
            : `Посмотреть ${prevPeriodButtonName}`
        }}
      </span>
    </button>
  </GlassCard>
</template>
