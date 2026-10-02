/**
 * @module app/composables/useExpenseAnalytics
 * @fileoverview Аналитика и агрегированные метрики расходов
 * @description
 * Отвечает исключительно за логику расходов:
 * - суммарные фактические расходы за текущий и предыдущий периоды;
 * - среднедневной темп трат текущего периода (avgDaily);
 * - среднедневной темп трат прошлого периода (prevAvgDaily);
 * - процентное изменение расходов с защитой от искажений неполного месяца;
 * - интеграция с прогнозом расходов до конца месяца (useSpendingForecast).
 */
import { computed, type Ref, type ComputedRef } from "vue";
import type { AnalyticsPeriodType } from "./useAnalyticsPeriod";
import type { Transaction } from "./useTransactions";
import { differenceInCalendarDays } from "date-fns";
import {
  calculateDailyAverage,
  calculatePercentChange,
} from "~/utils/analytics";
import { getDaysInMonthCount, isCurrentMonth } from "~/utils/date";

export interface ExpenseAnalyticsOptions {
  currentExpenses: ComputedRef<Transaction[]> | Ref<Transaction[]>;
  prevExpenses: ComputedRef<Transaction[]> | Ref<Transaction[]>;
  period: Ref<AnalyticsPeriodType>;
  endDate: Ref<Date>;
  prevStartDate: Ref<Date>;
  prevEndDate: Ref<Date>;
  categoryId?: Ref<string | null>;
}

export const useExpenseAnalytics = (options: ExpenseAnalyticsOptions) => {
  const {
    currentExpenses,
    prevExpenses,
    period,
    endDate,
    prevStartDate,
    prevEndDate,
    categoryId,
  } = options;

  const totalSpent = computed(() =>
    currentExpenses.value.reduce((acc, t) => acc + t.amount, 0),
  );

  const prevTotalSpent = computed(() =>
    prevExpenses.value.reduce((acc, t) => acc + t.amount, 0),
  );

  const isCurrentMonthPeriod = computed(() => {
    return period.value === "1M" && isCurrentMonth(endDate.value);
  });

  const {
    forecast,
    avgDaily,
    upcomingSubscriptions,
    upcomingSubscriptionsTotal,
  } = useSpendingForecast({
    isCurrentMonthPeriod,
    totalSpent,
    currentExpenses,
    categoryId,
  });

  const prevDaysCount = computed(() => {
    if (isCurrentMonthPeriod.value) {
      return getDaysInMonthCount(prevStartDate.value);
    }
    return Math.max(
      1,
      differenceInCalendarDays(prevEndDate.value, prevStartDate.value) + 1,
    );
  });

  const prevAvgDaily = computed(() => {
    return calculateDailyAverage(prevTotalSpent.value, prevDaysCount.value);
  });

  // Процент изменения расходов:
  // - Для конкретной категории (в модалке категории) сравниваем общие траты по категории
  //   за текущий месяц со всеми тратами по этой категории за прошлый месяц.
  // - Для общих расходов на главной странице во вкладке «Месяц» сравниваем среднедневной темп трат (avgDaily vs prevAvgDaily).
  // - Для фиксированных периодов (неделя, 3 месяца) — итоговые суммы за период.
  const percentChange = computed(() => {
    const isCategoryView = Boolean(categoryId?.value);

    if (isCurrentMonthPeriod.value && !isCategoryView) {
      if (prevAvgDaily.value === 0) return 0;
      return calculatePercentChange(avgDaily.value, prevAvgDaily.value);
    }
    return calculatePercentChange(totalSpent.value, prevTotalSpent.value);
  });

  return {
    totalSpent,
    prevTotalSpent,
    avgDaily,
    prevAvgDaily,
    percentChange,
    forecast,
    upcomingSubscriptions,
    upcomingSubscriptionsTotal,
    isCurrentMonthPeriod,
  };
};
