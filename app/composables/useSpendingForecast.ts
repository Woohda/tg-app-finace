/**
 * @module app/composables/useSpendingForecast
 * @fileoverview Расчет прогноза расходов до конца текущего месяца
 * @description
 * Рассчитывает прогнозируемую сумму трат на конец месяца на основе:
 * - текущих фактических трат за вычетом уже прошедших регулярных платежей;
 * - средних ежедневных переменных расходов за прошедшие дни;
 * - запланированных регулярных платежей (подписок), которые еще предстоит списать.
 * ---
 * ### Логика работы:
 * 1. Загрузка списка подписок пользователя через `useSubscriptions`.
 * 2. Определение прошедших и оставшихся дней текущего календарного месяца.
 * 3. Фильтрация предстоящих подписок:
 *    - день списания больше сегодняшнего числа;
 *    - день списания сегодня, но транзакция еще не внесена в базу.
 * 4. Вычисление средних ежедневных переменных трат (`avgDailyVariable = (totalSpent - pastSubscriptionsTotal) / daysPassed`).
 * 5. Расчет итогового прогноза: `totalSpent + avgDailyVariable * remainingDays + upcomingSubscriptionsTotal`.
 */
import { computed, onMounted } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { Transaction } from "./useTransactions";

export interface SpendingForecastOptions {
  isCurrentMonthPeriod: ComputedRef<boolean> | Ref<boolean>;
  totalSpent: ComputedRef<number> | Ref<number>;
  currentExpenses: ComputedRef<Transaction[]> | Ref<Transaction[]>;
  categoryId?: Ref<string | null> | ComputedRef<string | null>;
}

export const useSpendingForecast = (options: SpendingForecastOptions) => {
  const { isCurrentMonthPeriod, totalSpent, currentExpenses, categoryId } =
    options;

  const { subscriptions, fetchSubscriptions } = useSubscriptions();

  onMounted(() => {
    if (subscriptions.value.length === 0) {
      fetchSubscriptions();
    }
  });

  const daysPassed = computed(() => {
    if (!isCurrentMonthPeriod.value) return 0;
    return new Date().getDate();
  });

  const daysInMonth = computed(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  });

  const remainingDays = computed(() => {
    return Math.max(0, daysInMonth.value - daysPassed.value);
  });

  // Плановые регулярные платежи текущего месяца, которые ещё не наступили
  const upcomingSubscriptions = computed(() => {
    if (!isCurrentMonthPeriod.value) return [];

    const now = new Date();
    const todayDate = now.getDate();
    const todayIso = now.toISOString().split("T")[0];

    return subscriptions.value.filter((sub) => {
      if (!sub.is_active) return false;
      if (categoryId?.value && sub.category_id !== categoryId.value)
        return false;

      // Ограничиваем плановый день количеством дней в месяце (например, 30 число в феврале -> 28/29)
      const dueDay = Math.min(sub.day_of_month, daysInMonth.value);

      // 1. Если день платежа позже сегодняшнего числа месяца — ещё не наступил
      if (dueDay > todayDate) {
        return true;
      }

      // 2. Если день платежа сегодня — проверяем, не внесён ли уже платёж в расходы
      if (dueDay === todayDate) {
        const alreadyRecorded = currentExpenses.value.some((tx) => {
          if (tx.date !== todayIso) return false;
          const isSameAmount = Math.abs(tx.amount - sub.amount) < 0.01;
          const isSameCategory =
            !sub.category_id || tx.categoryId === sub.category_id;
          const isSameName =
            tx.name &&
            (tx.name.includes(sub.name) || sub.name.includes(tx.name));
          return isSameAmount && (isSameCategory || isSameName);
        });
        return !alreadyRecorded;
      }

      return false;
    });
  });

  const upcomingSubscriptionsTotal = computed(() => {
    return upcomingSubscriptions.value.reduce((sum, s) => sum + s.amount, 0);
  });

  // Платежи, которые уже наступили ранее в этом месяце
  const pastSubscriptionsTotal = computed(() => {
    if (!isCurrentMonthPeriod.value) return 0;
    const todayDate = new Date().getDate();

    return subscriptions.value
      .filter((sub) => {
        if (!sub.is_active) return false;
        if (categoryId?.value && sub.category_id !== categoryId.value)
          return false;
        const dueDay = Math.min(sub.day_of_month, daysInMonth.value);
        return (
          dueDay <= todayDate &&
          !upcomingSubscriptions.value.some((u) => u.id === sub.id)
        );
      })
      .reduce((sum, s) => sum + s.amount, 0);
  });

  // Средний дневной расход (исторический за прошедшие дни)
  const avgDaily = computed(() => {
    if (totalSpent.value === 0 || !isCurrentMonthPeriod.value) return 0;
    if (daysPassed.value === 0) return 0;
    return Math.round(totalSpent.value / daysPassed.value);
  });

  // Переменные траты (за вычетом регулярных платежей, чтобы они не раздували ежедневный прогноз)
  const variableSpent = computed(() => {
    return Math.max(0, totalSpent.value - pastSubscriptionsTotal.value);
  });

  const avgDailyVariable = computed(() => {
    if (daysPassed.value === 0) return 0;
    return variableSpent.value / daysPassed.value;
  });

  // Прогноз трат до конца месяца (работает для текущего месяца "1M")
  // Формула: уже потрачено + будущие переменные расходы + плановые платежи, которые ещё не наступили
  const forecast = computed(() => {
    if (!isCurrentMonthPeriod.value) return null;
    if (totalSpent.value === 0 && upcomingSubscriptionsTotal.value === 0)
      return null;

    const expectedVariableFuture = Math.round(
      avgDailyVariable.value * remainingDays.value,
    );
    return (
      totalSpent.value +
      expectedVariableFuture +
      upcomingSubscriptionsTotal.value
    );
  });

  return {
    forecast,
    avgDaily,
    upcomingSubscriptions,
    upcomingSubscriptionsTotal,
  };
};
