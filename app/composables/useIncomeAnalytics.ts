/**
 * @module app/composables/useIncomeAnalytics
 * @fileoverview Аналитика и агрегированные метрики доходов
 * @description
 * Отвечает исключительно за логику доходов:
 * - суммарные доходы за текущий и предыдущий периоды;
 * - расчет доходов за прошлый период день-в-день (Month-To-Date / MTD);
 * - динамика доходов (% изменения) без ложного падения в начале месяца.
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

  // Доходы за предыдущий аналогичный период "день-в-день" (Month-To-Date)
  const prevMtdIncome = computed(() => {
    if (!isCurrentMonthPeriod.value) {
      return prevTotalIncome.value;
    }
    return calculateMtdIncome(prevIncome.value, currentDay.value);
  });

  // Динамика доходов в процентах:
  // Для текущего месяца сравниваем "день-в-день" (MTD), чтобы не сравнивать
  // первые дни месяца со всей зарплатой за прошлый месяц.
  const incomePercentChange = computed(() => {
    if (isCurrentMonthPeriod.value) {
      if (prevMtdIncome.value === 0 && totalIncome.value === 0) return 0;
      return calculatePercentChange(totalIncome.value, prevMtdIncome.value);
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
