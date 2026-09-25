/**
 * @module app/composables/useAnalyticsData
 * @fileoverview Агрегация и расчет данных для аналитики
 * @description
 * Фасадный composable для аналитики:
 * - запрашивает транзакции за текущий и предыдущий периоды;
 * - рассчитывает суммарные расходы/доходы и их динамику (% изменения);
 * - делегирует расчет прогноза до конца месяца в `useSpendingForecast`;
 * - делегирует агрегацию категорий и точек графика в чистые утилиты `~/utils/analytics`.
 * ---
 * ### Логика работы:
 * 1. Получение транзакций через `useTransactions` для текущего и предыдущего диапазонов дат.
 * 2. Фильтрация по типам `expense` / `income` и опциональному `categoryId`.
 * 3. Расчет относительного изменения показателей (`calculatePercentChange`).
 * 4. Получение прогноза расходов и плановых платежей через `useSpendingForecast`.
 * 5. Построение статистики категорий (`aggregateCategoryStats`) и графика (`buildAnalyticsChartData`).
 */
import { computed, type Ref } from "vue";
import type { AnalyticsPeriodType } from "./useAnalyticsPeriod";
import {
  aggregateCategoryStats,
  buildAnalyticsChartData,
  calculatePercentChange,
  type CategoryStat,
  type ChartDataPoint,
} from "~/utils/analytics";

export const useAnalyticsData = (
  period: Ref<AnalyticsPeriodType>,
  startDate: Ref<Date>,
  endDate: Ref<Date>,
  prevStartDate: Ref<Date>,
  prevEndDate: Ref<Date>,
  categoryId?: Ref<string | null>,
) => {
  const { transactions: currentTxs, pending: pendingCurrent } = useTransactions(
    {
      startDate,
      endDate,
    },
  );

  const { transactions: prevTxs, pending: pendingPrev } = useTransactions({
    startDate: prevStartDate,
    endDate: prevEndDate,
  });

  const pending = computed(() => pendingCurrent.value || pendingPrev.value);

  const currentExpenses = computed(() =>
    currentTxs.value.filter((t) => {
      if (t.type !== "expense") return false;
      if (categoryId?.value && t.categoryId !== categoryId.value) return false;
      return true;
    }),
  );

  const currentIncome = computed(() =>
    currentTxs.value.filter((t) => {
      if (t.type !== "income") return false;
      if (categoryId?.value && t.categoryId !== categoryId.value) return false;
      return true;
    }),
  );

  const prevIncome = computed(() =>
    prevTxs.value.filter((t) => {
      if (t.type !== "income") return false;
      if (categoryId?.value && t.categoryId !== categoryId.value) return false;
      return true;
    }),
  );

  const prevExpenses = computed(() =>
    prevTxs.value.filter((t) => {
      if (t.type !== "expense") return false;
      if (categoryId?.value && t.categoryId !== categoryId.value) return false;
      return true;
    }),
  );

  const totalSpent = computed(() =>
    currentExpenses.value.reduce((acc, t) => acc + t.amount, 0),
  );

  const totalIncome = computed(() =>
    currentIncome.value.reduce((acc, t) => acc + t.amount, 0),
  );

  const prevTotalSpent = computed(() =>
    prevExpenses.value.reduce((acc, t) => acc + t.amount, 0),
  );

  const prevTotalIncome = computed(() =>
    prevIncome.value.reduce((acc, t) => acc + t.amount, 0),
  );

  // Изменение в процентах к прошлому периоду
  const percentChange = computed(() =>
    calculatePercentChange(totalSpent.value, prevTotalSpent.value),
  );

  const incomePercentChange = computed(() =>
    calculatePercentChange(totalIncome.value, prevTotalIncome.value),
  );

  const currentDay = computed(() => getDayOfMonth());

  // Проверяем, является ли выбранный период текущим месяцем
  const isCurrentMonthPeriod = computed(() => {
    return period.value === "1M" && isCurrentMonth(endDate.value);
  });

  // Прогноз расходов и плановые списания
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

  // Группировка по категориям
  const categoryStats = computed<CategoryStat[]>(() =>
    aggregateCategoryStats(currentExpenses.value, totalSpent.value),
  );

  // Данные для графика
  const chartData = computed<ChartDataPoint[]>(() =>
    buildAnalyticsChartData(
      currentExpenses.value,
      startDate.value,
      endDate.value,
      period.value,
    ),
  );

  return {
    pending,
    totalSpent,
    prevTotalSpent,
    currentIncome,
    totalIncome,
    incomePercentChange,
    percentChange,
    forecast,
    avgDaily,
    upcomingSubscriptionsTotal,
    upcomingSubscriptions,
    currentDay,
    categoryStats,
    chartData,
  };
};
