/**
 * @module app/utils/analytics
 * @fileoverview Чистые функции агрегации и вычисления аналитических данных
 * @description
 * Набор чистых функций без состояния для:
 * - группировки расходов по категориям с расчетом процентных долей;
 * - построения временных рядов (точек графика) по дням и месяцам;
 * - вычисления относительного изменения показателей за периоды (MoM / WoW).
 * ---
 * ### Логика работы:
 * - `aggregateCategoryStats`: формирует рейтинг категорий расходов с процентами от общей суммы.
 * - `buildAnalyticsChartData`: заполняет пустые интервалы дат нулями и агрегирует суммы по дням/месяцам.
 * - `calculatePercentChange`: рассчитывает процентное изменение между двумя числами с защитой от деления на 0.
 */
import type { Transaction } from "~/composables/useTransactions";
import type { AnalyticsPeriodType } from "~/composables/useAnalyticsPeriod";

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
 * Рассчитывает процентное изменение между текущим и предыдущим значениями.
 */
export function calculatePercentChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
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

  const data: Record<string, number> = {};
  const start = toSafeDate(startDate);
  const end = toSafeDate(endDate);

  const isDaily = ["1W", "1M"].includes(period);

  if (isDaily) {
    for (let d = start; d <= end; d = addDaysSafe(d, 1)) {
      const key = formatShortDayMonth(d);
      data[key] = 0;
    }
    expenses.forEach((t) => {
      const d = toSafeDate(t.date);
      const key = formatShortDayMonth(d);
      if (data[key] !== undefined) {
        data[key] += t.amount;
      }
    });
  } else {
    for (let d = startOfMonthSafe(start); d <= end; d = getNextMonth(d)) {
      const key = formatShortMonth(d);
      data[key] = 0;
    }
    expenses.forEach((t) => {
      const d = toSafeDate(t.date);
      const key = formatShortMonth(d);
      if (data[key] !== undefined) {
        data[key] += t.amount;
      }
    });
  }

  return Object.entries(data).map(([label, value]) => ({ label, value }));
}
