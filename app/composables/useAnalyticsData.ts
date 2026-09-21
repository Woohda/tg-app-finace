/**
 * @module app/composables/useAnalyticsData
 * @fileoverview Агрегация и расчет данных для аналитики
 * @description
 * Берет транзакции за текущий и предыдущий периоды и рассчитывает:
 * общую сумму, рост/падение в процентах (MoM), прогноз до конца месяца,
 * а также группирует траты по категориям и по дням/месяцам для графиков.
 * ---
 * ### Логика работы:
 * 1. Получение транзакций через `useTransactions` для двух диапазонов дат.
 * 2. Фильтрация только `expense` (расходы).
 * 3. Агрегация по категориям для списка топ-категорий.
 * 4. Формирование данных для столбчатого графика (группировка по дням/неделям/месяцам).
 * 5. Расчет `forecast` на основе среднего дневного расхода.
 */
import { computed, type Ref } from "vue";
import type { AnalyticsPeriodType } from "./useAnalyticsPeriod";

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percent: number; // От общей суммы трат
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

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

  // Изменение в процентах
  const percentChange = computed(() => {
    if (prevTotalSpent.value === 0) return totalSpent.value > 0 ? 100 : 0;
    return Math.round(
      ((totalSpent.value - prevTotalSpent.value) / prevTotalSpent.value) * 100,
    );
  });

  const incomePercentChange = computed(() => {
    if (prevTotalIncome.value === 0) return totalIncome.value > 0 ? 100 : 0;
    return Math.round(
      ((totalIncome.value - prevTotalIncome.value) / prevTotalIncome.value) *
        100,
    );
  });

  const currentDay = computed(() => new Date().getDate());

  const avgDaily = computed(() => {
    if (totalSpent.value === 0) return 0;
    if (period.value !== "1M") return 0;
    const now = new Date();
    if (endDate.value.getTime() < now.getTime()) return 0;
    const daysPassed = now.getDate();
    if (daysPassed === 0) return 0;
    return Math.round(totalSpent.value / daysPassed);
  });

  // Прогноз трат (работает лучше всего для "1M")
  const forecast = computed(() => {
    if (avgDaily.value === 0) return null;
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return Math.round(avgDaily.value * daysInMonth);
  });

  // Группировка по категориям
  const categoryStats = computed<CategoryStat[]>(() => {
    const map = new Map<string, CategoryStat>();

    currentExpenses.value.forEach((t) => {
      if (!map.has(t.categoryId)) {
        map.set(t.categoryId, {
          categoryId: t.categoryId,
          categoryName: t.categoryName,
          categoryIcon: t.categoryIcon,
          amount: 0,
          percent: 0,
        });
      }
      map.get(t.categoryId)!.amount += t.amount;
    });

    const stats = Array.from(map.values()).sort((a, b) => b.amount - a.amount);

    // Считаем проценты
    if (totalSpent.value > 0) {
      stats.forEach((s) => {
        s.percent = Math.round((s.amount / totalSpent.value) * 100);
      });
    }

    return stats;
  });

  // Данные для графика
  const chartData = computed<ChartDataPoint[]>(() => {
    if (currentExpenses.value.length === 0) return [];

    const data: Record<string, number> = {};

    // Заполняем нулями все дни в периоде
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);

    // В зависимости от периода, формат ключа меняется (по дням, либо по месяцам)
    const isDaily = ["1W", "1M"].includes(period.value);

    if (isDaily) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getDate()} ${d.toLocaleString("ru", { month: "short" })}`;
        data[key] = 0;
      }
      currentExpenses.value.forEach((t) => {
        const d = new Date(t.date);
        const key = `${d.getDate()} ${d.toLocaleString("ru", { month: "short" })}`;
        if (data[key] !== undefined) {
          data[key] += t.amount;
        }
      });
    } else {
      // 3M, 6M, 1Y - по месяцам
      for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        const key = d.toLocaleString("ru", { month: "short" });
        data[key] = 0;
      }
      currentExpenses.value.forEach((t) => {
        const d = new Date(t.date);
        const key = d.toLocaleString("ru", { month: "short" });
        if (data[key] !== undefined) {
          data[key] += t.amount;
        }
      });
    }

    return Object.entries(data).map(([label, value]) => ({ label, value }));
  });

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
    currentDay,
    categoryStats,
    chartData,
  };
};
