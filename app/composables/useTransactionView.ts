/**
 * @module app/composables/useTransactionView
 * @fileoverview Управление фильтрацией и агрегацией транзакций
 * 
 * @description
 * Принимает реактивный список транзакций и предоставляет computed свойства
 * для агрегации данных (доходы, расходы, баланс) за выбранный месяц.
 * Также рассчитывает процент выполнения бюджета.
 * 
 * ### Логика:
 * - Выполняет фильтрацию по дням/неделям для списков.
 * - Выполняет подсчет `monthlyExpense` и `monthlyIncome` для аналитики.
 * - Сравнивает `monthlyExpense` с `monthlyBudget` для прогресс-бара.
 */
import { ref, computed, watch } from "vue";
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
  options?: { currentDate?: Ref<Date> }
) => {
  const activePeriod = ref<PeriodType>("week");

  if (options?.currentDate) {
    watch(
      options.currentDate,
      (newDate) => {
        const now = new Date();
        const isCurrentMonth =
          newDate.getMonth() === now.getMonth() &&
          newDate.getFullYear() === now.getFullYear();

        activePeriod.value = isCurrentMonth ? "week" : "month";
      },
      { immediate: true }
    );
  }

  const periods: PeriodOption[] = [
    { id: "day", label: "День" },
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
  ];

  // --- Фильтрация по периоду ---

  const filteredTransactions = computed<Transaction[]>(() => {
    if (activePeriod.value === "month") {
      return transactions.value; // Бэкенд уже вернул нужный месяц
    }
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
        return "За этот период трат нет";
    }
  });

  // --- Месячные агрегации ---
  // Всегда считаются за весь загруженный список (бэкенд уже фильтрует по месяцу)

  const monthlyTransactions = computed(() => {
    return transactions.value;
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

  // --- Бюджет ---
  const { budget: monthlyBudget, fetchBudget } = useBudgets();
  
  // Инициализируем загрузку бюджета
  fetchBudget();

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
