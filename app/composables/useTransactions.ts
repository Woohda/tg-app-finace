/**
 * @module app/composables/useTransactions
 * @fileoverview Composable для работы с транзакциями, фильтрацией по периодам и месячным бюджетом
 * @description
 * Предоставляет реактивное состояние для списка транзакций с фильтрацией по периодам
 * (день, неделя, месяц), а также расчет показателей общего месячного бюджета.
 * ---
 * ### Логика:
 * 1. `activePeriod`: Текущий выбранный период ('day' | 'week' | 'month')
 * 2. `filteredTransactions`: Список транзакций, отфильтрованный по выбранному периоду
 * 3. `monthlyExpense` / `monthlyBudget` / `monthlyBudgetPercent`: Месячные показатели
 *    (бюджет рассчитывается строго на месяц и не меняется от фильтра периода)
 */
import { ref, computed } from "vue";
import {
  mockTransactions,
  mockBudget,
  mockTotalExpense,
  type MockTransaction,
} from "~/mocks/dashboard";

export type PeriodType = "day" | "week" | "month";

export interface PeriodOption {
  id: PeriodType;
  label: string;
}

export const useTransactions = () => {
  const activePeriod = ref<PeriodType>("week");

  const periods: PeriodOption[] = [
    { id: "day", label: "День" },
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
  ];

  // Фильтрация транзакций по периоду (траты отображаются под выбранный фильтр)
  const filteredTransactions = computed<MockTransaction[]>(() => {
    if (activePeriod.value === "day") {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - 1);
      return mockTransactions.filter(
        (t) => t.date >= dayStart.toISOString().split("T")[0],
      );
    }
    if (activePeriod.value === "week") {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      return mockTransactions.filter(
        (t) => t.date >= weekStart.toISOString().split("T")[0],
      );
    }
    return mockTransactions;
  });

  // Сообщение для пустого списка в зависимости от периода
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

  // Показатели месячного бюджета (фиксированы на месяц)
  const monthlyBudget = ref(mockBudget);
  const monthlyExpense = ref(mockTotalExpense);

  const monthlyBudgetPercent = computed(() => {
    if (monthlyBudget.value <= 0) return 0;
    return Math.round((monthlyExpense.value / monthlyBudget.value) * 100);
  });

  return {
    activePeriod,
    periods,
    filteredTransactions,
    emptyMessage,
    monthlyBudget,
    monthlyExpense,
    monthlyBudgetPercent,
  };
};
