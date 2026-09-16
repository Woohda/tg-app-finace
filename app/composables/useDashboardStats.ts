/**
 * @module app/composables/useDashboardStats
 * @fileoverview Вычисление и получение статистики для дашборда
 * 
 * @description
 * Подготавливает данные для визуализации на главном экране. 
 * Принимает реактивный список транзакций и вычисляет историю баланса 
 * и топ-5 категорий расходов. Параллельно запрашивает агрегированную сводку с сервера.
 * 
 * ### Логика:
 * - `balanceHistory`: Аккумулирует изменения баланса по датам для графика.
 * - `expensesByCategory`: Группирует расходы по категориям, возвращает топ-5 с присвоенными цветами.
 * - `recentTransactions`: Возвращает 5 последних транзакций.
 */
import { computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { Transaction } from "./useTransactions";

export const useDashboardStats = (
  transactions: ComputedRef<Transaction[]> | Ref<Transaction[]>
) => {
  const balanceHistory = computed(() => {
    if (transactions.value.length === 0) return [0, 0];
    
    let currentBal = 0;
    const history = [0];
    
    const sorted = [...transactions.value].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    sorted.forEach((t) => {
      if (t.type === "income") currentBal += t.amount;
      if (t.type === "expense") currentBal -= t.amount;
      history.push(currentBal);
    });
    
    return history;
  });

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

    const colors = [
      "#F43F5E", // Rose 500 (мягче чем Rose 600)
      "#D946EF", // Fuchsia 500 (мягче чем Fuchsia 600)
      "#8B5CF6", // Violet 500 (мягче чем Violet 600)
      "#F97316", // Orange 500 (мягче чем Orange 600)
      "#F59E0B", // Amber 500 (мягче чем Amber 600)
    ];

    return sorted.map((cat, index) => ({
      ...cat,
      color: colors[index % colors.length] as string,
    }));
  });

  const recentTransactions = computed(() => transactions.value.slice(0, 5));

  // Запрашиваем агрегированную статистику с бэкенда
  const { token } = useAuth();
  const { data: dashboardStats, pending: statsPending } = useFetch("/api/stats/dashboard", {
    headers: computed(() => ({
      Authorization: `Bearer ${token.value}`,
    })),
  });

  return {
    balanceHistory,
    expensesByCategory,
    recentTransactions,
    dashboardStats,
    statsPending,
  };
};
