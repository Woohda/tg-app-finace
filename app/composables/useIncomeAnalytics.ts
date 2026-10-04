/**
 * @module app/composables/useIncomeAnalytics
 * @fileoverview Аналитика и агрегированные метрики доходов
 * @description
 * Отвечает за логику аналитики доходов:
 * - суммарные доходы за текущий и сравнительный периоды;
 * - расчет поступлений день-в-день (Month-To-Date / MTD) для устранения эффекта неполного месяца;
 * - процентная динамика доходов без ложных просадок в начале расчетного периода.
 * ---
 * ### Логика работы:
 * 1. Вычисляет общие суммы поступлений `totalIncome` и `prevTotalIncome` за сравниваемые интервалы.
 * 2. Для текущего месяца рассчитывает доходы предшествующего месяца MTD (`prevMtdIncome`) до сегодняшнего числа.
 * 3. Для архивного месяца рассчитывает поступления архивного месяца MTD и сопоставляет их с поступлениями текущего месяца на ту же дату.
 * 4. Для фиксированных периодов (1W, 3M, 6M, 1Y) сопоставляет полные суммы за период.
 */
import { computed, type Ref, type ComputedRef } from "vue";
import type { AnalyticsPeriodType } from "./useAnalyticsPeriod";
import type { Transaction } from "./useTransactions";
import {
  calculateMtdIncome,
  calculatePercentChange,
} from "~/utils/analytics";
import { isCurrentMonth, getDayOfMonth } from "~/utils/date";

export interface IncomeAnalyticsOptions {
  currentIncome: ComputedRef<Transaction[]> | Ref<Transaction[]>;
  prevIncome: ComputedRef<Transaction[]> | Ref<Transaction[]>;
  period: Ref<AnalyticsPeriodType>;
  endDate: Ref<Date>;
  currentDay?: Ref<number> | ComputedRef<number>;
}

export const useIncomeAnalytics = (options: IncomeAnalyticsOptions) => {
  const { currentIncome, prevIncome, period, endDate } = options;

  const totalIncome = computed(() =>
    currentIncome.value.reduce((acc, t) => acc + t.amount, 0),
  );

  const prevTotalIncome = computed(() =>
    prevIncome.value.reduce((acc, t) => acc + t.amount, 0),
  );

  const currentDay = options.currentDay || computed(() => getDayOfMonth());

  const isCurrentMonthPeriod = computed(() => {
    return period.value === "1M" && isCurrentMonth(endDate.value);
  });

  const isSelectedPastMonth = computed(() => {
    return period.value === "1M" && !isCurrentMonth(endDate.value);
  });

  // Доходы за предыдущий аналогичный период "день-в-день" (Month-To-Date)
  const prevMtdIncome = computed(() => {
    if (!isCurrentMonthPeriod.value) {
      return prevTotalIncome.value;
    }
    return calculateMtdIncome(prevIncome.value, currentDay.value);
  });

  // Динамика доходов в процентах:
  // - Для текущего месяца сравниваем "день-в-день" (MTD), чтобы не сравнивать первые дни месяца со всей зарплатой за прошлый месяц.
  // - Для прошлого месяца сравниваем доходы за прошлый месяц MTD с текущими доходами на этот же день.
  const incomePercentChange = computed(() => {
    if (isCurrentMonthPeriod.value) {
      if (prevMtdIncome.value === 0 && totalIncome.value === 0) return 0;
      return calculatePercentChange(totalIncome.value, prevMtdIncome.value);
    }
    if (isSelectedPastMonth.value) {
      const pastMtdIncome = calculateMtdIncome(
        currentIncome.value,
        currentDay.value,
      );
      if (prevTotalIncome.value === 0 && pastMtdIncome === 0) return 0;
      return calculatePercentChange(pastMtdIncome, prevTotalIncome.value);
    }
    return calculatePercentChange(totalIncome.value, prevTotalIncome.value);
  });

  return {
    totalIncome,
    prevTotalIncome,
    prevMtdIncome,
    incomePercentChange,
  };
};
