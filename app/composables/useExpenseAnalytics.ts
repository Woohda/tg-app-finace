/**
 * @module app/composables/useExpenseAnalytics
 * @fileoverview Аналитика и агрегированные метрики расходов
 * @description
 * Отвечает за вычисление аналитических метрик расходов:
 * - суммарные фактические расходы за текущий и сравнительный периоды;
 * - среднедневной темп трат текущего периода (avgDaily);
 * - среднедневной темп трат сравнительного периода (prevAvgDaily);
 * - процентное изменение расходов с защитой от искажений неполного месяца;
 * - интеграция с прогнозом расходов до конца месяца (useSpendingForecast).
 * ---
 * ### Логика работы:
 * 1. Рассчитывает общие суммы трат `totalSpent` и `prevTotalSpent` за сравниваемые интервалы.
 * 2. Вычисляет среднедневной темп `avgDaily`: для текущего месяца использует прогнозный темп переменных трат, для архивного — делит сумму на общее число дней месяца.
 * 3. Вычисляет сравнительный среднедневной темп `prevAvgDaily`: для неполного текущего месяца делит на число фактически прошедших дней.
 * 4. Рассчитывает процентное изменение `percentChange`:
 *    - для конкретной категории (`isCategoryView`) сравнивает фактические итоговые суммы;
 *    - для общих расходов за период 1M сравнивает среднедневной темп трат;
 *    - для фиксированных периодов (1W, 3M, 6M, 1Y) сравнивает абсолютные суммы.
 */
import { computed, type Ref, type ComputedRef } from "vue";
import type { AnalyticsPeriodType } from "./useAnalyticsPeriod";
import type { Transaction } from "./useTransactions";
import { differenceInCalendarDays } from "date-fns";
import {
  calculateDailyAverage,
  calculatePercentChange,
} from "~/utils/analytics";
import {
  getDaysInMonthCount,
  isCurrentMonth,
  getDaysPassedInMonth,
} from "~/utils/date";

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

  const isSelectedPastMonth = computed(() => {
    return period.value === "1M" && !isCurrentMonth(endDate.value);
  });

  const {
    forecast,
    avgDaily: currentMonthAvgDaily,
    upcomingSubscriptions,
    upcomingSubscriptionsTotal,
  } = useSpendingForecast({
    isCurrentMonthPeriod,
    totalSpent,
    currentExpenses,
    categoryId,
  });

  const avgDaily = computed(() => {
    if (isCurrentMonthPeriod.value) {
      return currentMonthAvgDaily.value;
    }
    if (isSelectedPastMonth.value) {
      const days = getDaysInMonthCount(endDate.value);
      return calculateDailyAverage(totalSpent.value, days);
    }
    return 0;
  });

  const prevDaysCount = computed(() => {
    if (isCurrentMonthPeriod.value) {
      return getDaysInMonthCount(prevStartDate.value);
    }
    if (isSelectedPastMonth.value) {
      return Math.max(1, getDaysPassedInMonth());
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
  // - Для конкретной категории (в модалке категории) сравниваем общие траты по категории (totalSpent vs prevTotalSpent).
  // - Для общих расходов за период "1M" (средний чек на день) сравниваем среднедневной темп трат (avgDaily vs prevAvgDaily).
  // - Для фиксированных периодов (неделя, 3 месяца) — итоговые суммы за период.
  const percentChange = computed(() => {
    const isCategoryView = Boolean(categoryId?.value);

    if (period.value === "1M" && !isCategoryView) {
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
