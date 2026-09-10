/**
 * @module app/composables/useTransactionView
 * @fileoverview Composable для фильтрации и агрегации транзакций
 * @description
 * Принимает реактивный список транзакций из `useTransactions` и предоставляет:
 * - фильтрацию по периодам (день, неделя, месяц)
 * - месячные агрегации (расходы, доходы, баланс)
 * - бюджетный процент
 *
 * Все computed кешируются Vue и пересчитываются только при изменении
 * исходного массива транзакций или активного периода.
 */
import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { Transaction } from "./useTransactions";

export type PeriodType = "day" | "week" | "month";

export interface PeriodOption {
  id: PeriodType;
  label: string;
}

/**
 * Возвращает timestamp начала периода.
 * Вынесено в чистую функцию для тестируемости.
 */
function getPeriodStart(period: PeriodType): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    start.setDate(start.getDate() - 7);
  } else if (period === "month") {
    start.setMonth(start.getMonth() - 1);
  }

  return start;
}

export const useTransactionView = (
  transactions: ComputedRef<Transaction[]> | Ref<Transaction[]>,
) => {
  const activePeriod = ref<PeriodType>("week");

  const periods: PeriodOption[] = [
    { id: "day", label: "День" },
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
  ];

  // --- Фильтрация по периоду ---

  const filteredTransactions = computed<Transaction[]>(() => {
    const periodStart = getPeriodStart(activePeriod.value);
    return transactions.value.filter(
      (t) => new Date(t.date) >= periodStart,
    );
  });

  const emptyMessage = computed<string>(() => {
    switch (activePeriod.value) {
      case "day":
        return "За этот день трат нет";
      case "week":
        return "За эту неделю трат нет";
      case "month":
        return "За этот месяц трат нет";
    }
  });

  // --- Месячные агрегации ---
  // Всегда считаются за последний месяц, независимо от activePeriod

  const monthlyTransactions = computed(() => {
    const monthStart = getPeriodStart("month");
    return transactions.value.filter(
      (t) => new Date(t.date) >= monthStart,
    );
  });

  const monthlyExpense = computed(() =>
    monthlyTransactions.value
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  const monthlyIncome = computed(() =>
    monthlyTransactions.value
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  const balance = computed(() => monthlyIncome.value - monthlyExpense.value);

  // --- Бюджет (хардкод до Фазы 6) ---

  const monthlyBudget = ref(60000);

  const monthlyBudgetPercent = computed(() => {
    if (monthlyBudget.value <= 0) return 0;
    return Math.round((monthlyExpense.value / monthlyBudget.value) * 100);
  });

  return {
    activePeriod,
    periods,
    filteredTransactions,
    emptyMessage,
    monthlyExpense,
    monthlyIncome,
    balance,
    monthlyBudget,
    monthlyBudgetPercent,
  };
};
