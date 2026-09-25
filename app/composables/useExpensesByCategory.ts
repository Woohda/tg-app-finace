/**
 * @module app/composables/useExpensesByCategory
 * @fileoverview Вычисление расходов по категориям для дашборда
 *
 * @description
 * Принимает реактивный список транзакций и группирует расходы по категориям.
 * Возвращает топ-5 категорий с наибольшими расходами с присвоенными цветами палитры.
 * ---
 * ### Логика работы:
 * - Фильтрует транзакции типа "expense".
 * - Агрегирует сумму по каждой категории (categoryId).
 * - Сортирует по убыванию суммы и выбирает топ-5 категорий.
 * - Присваивает каждой категории цвет из заданной дизайн-палитры.
 */
import { computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { Transaction } from "./useTransactions";

export const useExpensesByCategory = (
  transactions: ComputedRef<Transaction[]> | Ref<Transaction[]>,
) => {
  const expensesByCategory = computed(() => {
    const expenseMap = new Map<
      string,
      { amount: number; name: string; icon: string | null }
    >();

    transactions.value
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const current = expenseMap.get(t.categoryId) || {
          amount: 0,
          name: t.categoryName,
          icon: t.categoryIcon,
        };
        current.amount += t.amount;
        expenseMap.set(t.categoryId, current);
      });

    const sorted = Array.from(expenseMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        icon: data.icon,
        amount: data.amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const colors = ["#d81a45", "#d84e1a", "#d8ad1a", "#1aa4d8", "#8e6bed"];

    return sorted.map((cat, index) => ({
      ...cat,
      color: colors[index % colors.length] as string,
    }));
  });

  return {
    expensesByCategory,
  };
};
