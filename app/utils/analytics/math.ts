/**
 * @module app/utils/analytics/math
 * @fileoverview Базовые математические расчеты и нормализация аналитических данных
 * @description
 * Набор чистых функций для базовых расчетов аналитики:
 * - процентное изменение показателей за сравниваемые периоды;
 * - среднедневной темп расходов и доходов;
 * - медиана сумм операций (робастная к единичным всплескам);
 * - календарная нормализация для честного сопоставления месяцев разной длины;
 * - накопленный доход Month-to-Date (MTD).
 * ---
 * ### Логика работы:
 * 1. Защищает расчеты от деления на 0 при нулевых или пустых исходных данных.
 * 2. Приводит сравниваемые месяцы (например, 28 и 31 день) к единому суточному эквиваленту.
 * 3. Использует сортировку числового массива для поиска центрального значения (медианы).
 */
import type { Transaction } from "~/composables/useTransactions";
import { toSafeDate } from "../date";

/**
 * Рассчитывает процентное изменение между текущим и предыдущим значениями с защитой от деления на 0.
 */
export function calculatePercentChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Рассчитывает средний дневной показатель с защитой от деления на 0.
 */
export function calculateDailyAverage(
  totalAmount: number,
  daysCount: number,
): number {
  if (totalAmount === 0 || daysCount <= 0) return 0;
  return Math.round(totalAmount / daysCount);
}

/**
 * Вычисляет медиану числового массива.
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Нормализует сумму расходов с одного календарного периода (в днях) на другой (в днях).
 * Используется для устранения календарных перекосов при сравнении месяцев разной длины
 * (например, 28 дней в феврале vs 31 день в марте).
 */
export function normalizeMonthlyAmount(
  amount: number,
  sourceDays: number,
  targetDays: number,
): number {
  if (amount === 0 || sourceDays <= 0 || targetDays <= 0) return amount;
  if (sourceDays === targetDays) return amount;
  return Math.round((amount / sourceDays) * targetDays);
}

/**
 * Вычисляет сумму доходов за период до указанного дня месяца включительно (Month-to-Date).
 */
export function calculateMtdIncome(
  incomes: Transaction[],
  maxDay: number,
): number {
  return incomes
    .filter((t) => {
      const match = t.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const day =
        match && match[3]
          ? parseInt(match[3], 10)
          : toSafeDate(t.date).getDate();
      return day <= maxDay;
    })
    .reduce((acc, t) => acc + t.amount, 0);
}
