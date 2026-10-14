/**
 * @module app/utils/analytics/metrics
 * @fileoverview Агрегация статистики категорий, точки графиков и микро-метрики операций
 * @description
 * Набор чистых функций для агрегации и аналитики трат:
 * - группировка расходов по категориям и сортировка по убыванию суммы;
 * - генерация временных рядов (ChartDataPoint) с заполнением пустых промежутков;
 * - вычисление детальных микро-метрик трат (средний/медианный чек, частота, динамика).
 * ---
 * ### Логика работы:
 * 1. Агрегирует траты в Map по категориям и сортирует по убыванию абсолютной суммы.
 * 2. Генерирует непрерывную временную сетку (дни или месяцы) с нулевыми значениями для пустых интервалов.
 * 3. Рассчитывает средний чек, медиану, максимальную операцию и частоту трат на основе транзакций периода.
 */
import type { Transaction } from "~/composables/useTransactions";
import type { AnalyticsPeriodType } from "~/composables/useAnalyticsPeriod";
import {
  toSafeDate,
  formatShortDayMonth,
  formatShortMonth,
  addDaysSafe,
  startOfMonthSafe,
  getNextMonth,
} from "../date";
import { calculateMedian, calculatePercentChange } from "./math";

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percent: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

/**
 * Подробные микро-метрики по операциям категории за выбранный период.
 */
export interface CategoryDetailedMetrics {
  count: number;
  totalSpent: number;
  averageCheck: number;
  medianCheck: number;
  maxTransaction: Transaction | null;
  frequencyDays: number | null;
  countChange: number | null;
  averageCheckChange: number | null;
}

/**
 * Группирует массив расходов по категориям, сортирует по убыванию суммы
 * и вычисляет долю каждой категории в процентах от общих трат.
 */
export function aggregateCategoryStats(
  expenses: Transaction[],
  totalSpent: number,
): CategoryStat[] {
  const map = new Map<string, CategoryStat>();

  expenses.forEach((t) => {
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

  if (totalSpent > 0) {
    stats.forEach((s) => {
      s.percent = Math.round((s.amount / totalSpent) * 100);
    });
  }

  return stats;
}

/**
 * Формирует упорядоченный массив точек для графика за выбранный период.
 * Для периодов 1W/1M разбивает по дням, для 3M/6M/1Y — по месяцам.
 * Пропущенные даты инициализируются нулевыми суммами.
 */
export function buildAnalyticsChartData(
  expenses: Transaction[],
  startDate: Date,
  endDate: Date,
  period: AnalyticsPeriodType,
): ChartDataPoint[] {
  if (expenses.length === 0) return [];

  const start = toSafeDate(startDate);
  const end = toSafeDate(endDate);
  const isDaily = ["1W", "1M"].includes(period);

  if (isDaily) {
    const points: Array<{ key: string; label: string; value: number }> = [];
    const indexMap = new Map<string, number>();

    for (let d = start; d <= end; d = addDaysSafe(d, 1)) {
      const key = formatDateISO(d);
      const label = formatShortDayMonth(d);
      indexMap.set(key, points.length);
      points.push({ key, label, value: 0 });
    }

    expenses.forEach((t) => {
      const key = formatDateISO(t.date);
      const idx = indexMap.get(key);
      if (idx !== undefined) {
        points[idx]!.value += t.amount;
      }
    });

    return points.map(({ label, value }) => ({ label, value }));
  } else {
    const points: Array<{ key: string; label: string; value: number }> = [];
    const indexMap = new Map<string, number>();

    for (let d = startOfMonthSafe(start); d <= end; d = getNextMonth(d)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = formatShortMonth(d);
      indexMap.set(key, points.length);
      points.push({ key, label, value: 0 });
    }

    expenses.forEach((t) => {
      const d = toSafeDate(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const idx = indexMap.get(key);
      if (idx !== undefined) {
        points[idx]!.value += t.amount;
      }
    });

    return points.map(({ label, value }) => ({ label, value }));
  }
}



/**
 * Рассчитывает подробные микро-метрики по операциям категории за период:
 * - количество транзакций и средний чек;
 * - медианный чек (устойчивый к всплескам);
 * - максимальная разовая транзакция;
 * - интенсивность трат (периодичность в днях);
 * - динамика количества и среднего чека относительно предыдущего периода с нормализацией по дням.
 */
export function calculateCategoryDetailedMetrics(
  expenses: Transaction[],
  periodDays: number,
  prevExpenses: Transaction[] = [],
  prevPeriodDays?: number,
): CategoryDetailedMetrics {
  const count = expenses.length;
  const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
  const averageCheck = count > 0 ? Math.round(totalSpent / count) : 0;
  const medianCheck = calculateMedian(expenses.map((t) => t.amount));

  let maxTransaction: Transaction | null = null;
  if (count > 0) {
    maxTransaction = expenses.reduce(
      (max, t) => (t.amount > max.amount ? t : max),
      expenses[0]!,
    );
  }

  const frequencyDays =
    count > 0 && periodDays > 0
      ? Number((periodDays / count).toFixed(1))
      : null;

  const prevCount = prevExpenses.length;
  const prevTotal = prevExpenses.reduce((sum, t) => sum + t.amount, 0);
  const prevAverage = prevCount > 0 ? Math.round(prevTotal / prevCount) : 0;

  let countChange: number | null = null;
  let averageCheckChange: number | null = null;

  if (prevCount > 0) {
    const effectivePrevCount =
      prevPeriodDays && prevPeriodDays > 0 && periodDays > 0
        ? (prevCount / prevPeriodDays) * periodDays
        : prevCount;
    countChange = Math.round(
      ((count - effectivePrevCount) / effectivePrevCount) * 100,
    );
  }

  if (prevAverage > 0) {
    averageCheckChange = calculatePercentChange(averageCheck, prevAverage);
  }

  return {
    count,
    totalSpent,
    averageCheck,
    medianCheck,
    maxTransaction,
    frequencyDays,
    countChange,
    averageCheckChange,
  };
}
