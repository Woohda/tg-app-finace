<script setup lang="ts">
/**
 * @module app/components/analytics/CategoryMetricsCard
 * @fileoverview Карточка качественных микро-метрик трат по категории
 * @description
 * Отображает аналитическую сводку по операциям категории за выбранный период:
 * - средний и медианный чек покупки с динамикой к предыдущему периоду;
 * - общее количество операций и частоту покупок (периодичность в днях);
 * - самую крупную покупку периода с датой и описанием.
 * ---
 * ### Логика работы:
 * 1. Принимает рассчитанные метрики `CategoryDetailedMetrics` через пропсы.
 * 2. Отображает карточку среднего чека на всю ширину с индикатором динамики к прошлому периоду и медианой.
 * 3. Размещает сетку 50% / 50%: количество операций с периодичностью в днях и максимальный чек периода с датой и описанием.
 */
import { computed } from "vue";
import type { CategoryDetailedMetrics } from "~/utils/analytics";
import { formatAmount } from "~/utils/format";
import { formatShortDayMonth } from "~/utils/date";
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Scale,
  CalendarDays,
} from "@lucide/vue";

interface Props {
  metrics: CategoryDetailedMetrics;
  periodLabel?: string;
  comparisonLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  periodLabel: "за период",
  comparisonLabel: "к прошл. периоду",
});

const hasData = computed(() => props.metrics.count > 0);

const averageTrend = computed(() => {
  if (
    props.metrics.averageCheckChange === 0 ||
    props.metrics.averageCheckChange === null
  ) {
    return { icon: Minus, color: "text-text-secondary", text: "0%" };
  }
  const isUp = props.metrics.averageCheckChange > 0;
  return {
    icon: isUp ? TrendingUp : TrendingDown,
    color: isUp ? "text-accent-mid" : "text-accent-success",
    text: `${isUp ? "+" : ""}${props.metrics.averageCheckChange}%`,
  };
});

const maxTransactionDate = computed(() => {
  if (!props.metrics.maxTransaction) return "";
  return formatShortDayMonth(props.metrics.maxTransaction.date);
});
</script>

<template>
  <GlassCard v-if="hasData" class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <Receipt class="w-4 h-4 text-text-accent" stroke-width="2" />
        <span
          class="text-xs uppercase font-bold tracking-wide text-text-secondary"
        >
          Метрики покупок
        </span>
      </div>
      <span class="text-xs text-text-secondary font-medium">
        {{ periodLabel }}
      </span>
    </div>

    <!-- 1. Средний чек (на всю ширину) -->
    <div class="glass-pill p-3.5 rounded-2xl flex items-center justify-between">
      <div class="flex flex-col gap-0.5 min-w-0">
        <span
          class="text-[10px] uppercase font-bold tracking-wide text-text-secondary"
        >
          Средний чек
        </span>
        <span
          class="text-text-primary text-xl font-extrabold tracking-tight truncate"
        >
          {{ formatAmount(metrics.averageCheck) }}
        </span>
      </div>

      <div class="flex flex-col items-end gap-1 shrink-0">
        <div
          v-if="averageTrend"
          class="flex items-center gap-1 px-2 py-0.5 rounded-full glass-pill text-[11px] font-semibold"
          :class="averageTrend.color"
        >
          <component :is="averageTrend.icon" class="w-3 h-3 stroke-2" />
          <span>{{ averageTrend.text }}</span>
        </div>
        <div class="flex items-center gap-1 text-[10px] text-text-muted">
          <Scale class="w-3 h-3 text-text-secondary shrink-0" />
          <span>Мед. {{ formatAmount(metrics.medianCheck) }}</span>
        </div>
      </div>
    </div>

    <!-- 2. Сетка 50% / 50%: Операции и Максимальный чек -->
    <div class="grid grid-cols-2 gap-2.5">
      <!-- А. Количество операций -->
      <div
        class="glass-pill p-3 rounded-2xl flex flex-col justify-between gap-1 min-w-0"
      >
        <span
          class="text-[10px] uppercase font-bold tracking-wide text-text-secondary"
        >
          Операций
        </span>

        <div class="flex flex-col mt-0.5 min-w-0">
          <span
            class="text-text-primary text-base font-extrabold tracking-tight"
          >
            {{ metrics.count }}
          </span>
          <div
            v-if="metrics.frequencyDays !== null"
            class="flex items-center gap-1 text-[10px] text-text-muted mt-0.5 truncate"
          >
            <CalendarDays class="w-3 h-3 text-text-secondary shrink-0" />
            <span class="truncate"
              >1 раз в {{ metrics.frequencyDays }} дн.</span
            >
          </div>
        </div>
      </div>

      <!-- Б. Максимальный чек -->
      <div
        class="glass-pill p-3 rounded-2xl flex flex-col justify-between gap-1 min-w-0"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-[10px] uppercase font-bold tracking-wide text-text-secondary"
          >
            Макс. чек
          </span>
          <Flame class="w-4 h-4 text-accent-mid" :stroke-width="1.5" />
        </div>

        <div class="flex flex-col mt-0.5 min-w-0">
          <span
            class="text-text-primary text-base font-extrabold tracking-tight truncate"
          >
            {{
              metrics.maxTransaction
                ? formatAmount(metrics.maxTransaction.amount)
                : "0 ₽"
            }}
          </span>
          <div
            v-if="metrics.maxTransaction"
            class="flex items-center gap-1 text-[10px] text-text-muted mt-0.5 truncate"
          >
            <span class="shrink-0">{{ maxTransactionDate }}</span>
            <span v-if="metrics.maxTransaction.name" class="truncate">
              • {{ metrics.maxTransaction.name }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </GlassCard>
</template>
