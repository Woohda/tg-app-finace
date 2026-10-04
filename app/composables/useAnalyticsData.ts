/**
 * @module app/composables/useAnalyticsData
 * @fileoverview Фасадный composable для агрегации данных аналитики
 * @description
 * Объединяет загрузку транзакций и делегирует расчеты в специализированные composable:
 * - `useExpenseAnalytics`: расчет сумм, среднедневного темпа трат, динамики расходов и прогноза;
 * - `useIncomeAnalytics`: расчет сумм, поступлений день-в-день (MTD) и динамики доходов;
 * - `~/utils/analytics`: построение точек графика, распределение долей категорий и прогнозирование.
 * ---
 * ### Логика работы:
 * 1. Загружает транзакции текущего и предыдущего периодов через `useTransactions`.
 * 2. Фильтрует транзакции по типу (расходы/доходы) и выбранной категории.
 * 3. Делегирует расчет аналитики расходов в `useExpenseAnalytics` и доходов в `useIncomeAnalytics`.
 * 4. Генерирует распределение категорий `aggregateCategoryStats` и точки для графиков.
 */
import { computed, type Ref } from "vue";
import type { AnalyticsPeriodType } from "./useAnalyticsPeriod";
import {
  aggregateCategoryStats,
  buildAnalyticsChartData,
  type CategoryStat,
  type ChartDataPoint,
} from "~/utils/analytics";
import { getDayOfMonth } from "~/utils/date";

export const useAnalyticsData = (
  period: Ref<AnalyticsPeriodType>,
  startDate: Ref<Date>,
  endDate: Ref<Date>,
  prevStartDate: Ref<Date>,
  prevEndDate: Ref<Date>,
  categoryId?: Ref<string | null>,
) => {
  const { transactions: currentTxs, pending: pendingCurrent } = useTransactions({
    startDate,
    endDate,
  });

  const { transactions: prevTxs, pending: pendingPrev } = useTransactions({
    startDate: prevStartDate,
    endDate: prevEndDate,
  });

  const pending = computed(() => pendingCurrent.value || pendingPrev.value);

  // Фильтрация транзакций по типам (расходы / доходы) и категории
  const currentExpenses = computed(() =>
    currentTxs.value.filter((t) => {
      if (t.type !== "expense") return false;
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

  const currentDay = computed(() => getDayOfMonth());

  // 1. Аналитика расходов (суммы, среднедневной темп, прогноз)
  const {
    totalSpent,
    prevTotalSpent,
    avgDaily,
    prevAvgDaily,
    percentChange,
    forecast,
    categoryForecast,
    upcomingSubscriptions,
    upcomingSubscriptionsTotal,
  } = useExpenseAnalytics({
    currentExpenses,
    prevExpenses,
    period,
    endDate,
    prevStartDate,
    prevEndDate,
    categoryId,
  });

  // 2. Аналитика доходов (суммы, расчет день-в-день MTD)
  const {
    totalIncome,
    prevTotalIncome,
    prevMtdIncome,
    incomePercentChange,
  } = useIncomeAnalytics({
    currentIncome,
    prevIncome,
    period,
    endDate,
    currentDay,
  });

  // 3. Распределение по категориям
  const categoryStats = computed<CategoryStat[]>(() =>
    aggregateCategoryStats(currentExpenses.value, totalSpent.value),
  );

  // 4. Построение точек временного ряда для графика (текущий и прошлый периоды)
  const chartData = computed<ChartDataPoint[]>(() =>
    buildAnalyticsChartData(
      currentExpenses.value,
      startDate.value,
      endDate.value,
      period.value,
    ),
  );

  const prevChartData = computed<ChartDataPoint[]>(() =>
    buildAnalyticsChartData(
      prevExpenses.value,
      prevStartDate.value,
      prevEndDate.value,
      period.value,
    ),
  );

  return {
    pending,
    totalSpent,
    prevTotalSpent,
    currentExpenses,
    prevExpenses,
    currentIncome,
    totalIncome,
    prevTotalIncome,
    prevMtdIncome,
    incomePercentChange,
    percentChange,
    forecast,
    categoryForecast,
    avgDaily,
    prevAvgDaily,
    upcomingSubscriptionsTotal,
    upcomingSubscriptions,
    currentDay,
    categoryStats,
    chartData,
    prevChartData,
  };
};
