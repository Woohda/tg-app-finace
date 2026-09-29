/**
 * @module app/composables/useTransactionView
 * @fileoverview Управление фильтрацией и агрегацией транзакций
 * @description
 * Принимает реактивный список транзакций и предоставляет computed свойства
 * для агрегации данных (доходы, расходы, баланс) за выбранный месяц.
 * Также рассчитывает процент выполнения бюджета.
 * ---
 * ### Логика работы:
 * 1. Фильтрация транзакций по периодам («День», «Неделя», «Месяц») относительно `currentDate` без сдвига часовых поясов (`toSafeDate`).
 * 2. Подсчет суммарных расходов `monthlyExpense` и доходов `monthlyIncome`.
 * 3. Сопоставление расходов с бюджетом `monthlyBudget` для расчета процента прогресс-бара.
 */
import { ref, computed, watch } from "vue";
import type { Ref, ComputedRef } from "vue";
import { startOfDay, subDays, startOfMonth } from "date-fns";
import type { Transaction } from "./useTransactions";

export type PeriodType = "day" | "week" | "month";

export interface PeriodOption {
  id: PeriodType;
  label: string;
}

/**
 * Возвращает timestamp начала периода относительно базовой даты.
 * Вынесено в чистую функцию для тестируемости.
 */
function getPeriodStart(period: PeriodType, baseDate: Date = getNow()): Date {
  const start = startOfDay(baseDate);

  if (period === "day") {
    return start;
  } else if (period === "week") {
    return subDays(start, 6);
  } else if (period === "month") {
    return startOfMonth(start);
  }

  return start;
}

export const useTransactionView = (
  transactions: ComputedRef<Transaction[]> | Ref<Transaction[]>,
  options?: { currentDate?: Ref<Date> },
) => {
  const activePeriod = ref<PeriodType>("week");
  const searchQuery = ref("");

  if (options?.currentDate) {
    watch(
      options.currentDate,
      (newDate) => {
        const isCurrent = isCurrentMonth(newDate);
        activePeriod.value = isCurrent ? "week" : "month";
      },
      { immediate: true },
    );
  }

  const periods: PeriodOption[] = [
    { id: "day", label: "День" },
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
  ];

  // --- Фильтрация по периоду и поисковому запросу ---

  const filteredTransactions = computed<Transaction[]>(() => {
    let list = transactions.value;

    if (activePeriod.value !== "month") {
      const base = toSafeDate(options?.currentDate?.value);
      const isCurrent = isCurrentMonth(base);
      const targetDate = isCurrent ? getNow() : endOfMonthSafe(base);
      const periodStart = getPeriodStart(activePeriod.value, targetDate);
      list = list.filter((t) => toSafeDate(t.date) >= periodStart);
    }

    const query = searchQuery.value.trim().toLowerCase();
    if (!query) {
      return list;
    }

    return list.filter((t) => {
      const nameMatch = t.name?.toLowerCase().includes(query);
      const categoryMatch = t.categoryName?.toLowerCase().includes(query);
      const amountMatch = String(t.amount).includes(query);
      return Boolean(nameMatch || categoryMatch || amountMatch);
    });
  });

  const emptyMessage = computed<string>(() => {
    if (searchQuery.value.trim()) {
      return `Ничего не найдено по запросу «${searchQuery.value.trim()}»`;
    }

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

  const { budget: monthlyBudget } = useBudgets();

  const monthlyBudgetPercent = computed(() => {
    if (monthlyBudget.value <= 0) return 0;
    return Math.round((monthlyExpense.value / monthlyBudget.value) * 100);
  });

  // --- Агрегации отфильтрованного списка (по периоду и поиску) ---

  const filteredExpense = computed(() =>
    filteredTransactions.value
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  const filteredIncome = computed(() =>
    filteredTransactions.value
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  const filteredCount = computed(() => filteredTransactions.value.length);

  return {
    activePeriod,
    periods,
    searchQuery,
    filteredTransactions,
    filteredExpense,
    filteredIncome,
    filteredCount,
    emptyMessage,
    monthlyExpense,
    monthlyIncome,
    balance,
    monthlyBudget,
    monthlyBudgetPercent,
  };
};
