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
 * 2. Определение прошедших и оставшихся дней месяца через чистые функции `getDaysPassedInMonth()` и `getDaysInMonthCount()`.
 * 3. Фильтрация предстоящих подписок:
 *    - день списания больше сегодняшнего числа (`getEffectiveDayOfMonth`);
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
    return getDaysPassedInMonth();
  });

  const daysInMonth = computed(() => getDaysInMonthCount());

  const remainingDays = computed(() => {
    return Math.max(0, daysInMonth.value - daysPassed.value);
  });

  // Определяем, какие регулярные платежи уже фактически зафиксированы в расходах текущего месяца
  const recordedSubscriptionIds = computed<Set<string>>(() => {
    const recordedIds = new Set<string>();
    if (!isCurrentMonthPeriod.value) return recordedIds;

    const availableExpenses = [...currentExpenses.value];

    for (const sub of subscriptions.value) {
      if (!sub.is_active) continue;
      if (categoryId?.value && sub.category_id !== categoryId.value) continue;

      const txIndex = availableExpenses.findIndex((tx) => {
        const isSameAmount = Math.abs(tx.amount - sub.amount) < 0.01;
        if (!isSameAmount) return false;

        const isSameCategory =
          !sub.category_id || tx.categoryId === sub.category_id;
        const isSameName =
          Boolean(tx.name) &&
          Boolean(sub.name) &&
          (tx.name!.toLowerCase().includes(sub.name.toLowerCase()) ||
            sub.name.toLowerCase().includes(tx.name!.toLowerCase()));

        return isSameCategory || isSameName;
      });

      if (txIndex !== -1) {
        recordedIds.add(sub.id);
        availableExpenses.splice(txIndex, 1);
      }
    }

    return recordedIds;
  });

  // Плановые регулярные платежи текущего месяца, которые ещё предстоит списать
  const upcomingSubscriptions = computed(() => {
    if (!isCurrentMonthPeriod.value) return [];

    return subscriptions.value.filter((sub) => {
      if (!sub.is_active) return false;
      if (categoryId?.value && sub.category_id !== categoryId.value)
        return false;

      // Если платеж еще не внесен в расходы — он считается предстоящим к списанию
      return !recordedSubscriptionIds.value.has(sub.id);
    });
  });

  const upcomingSubscriptionsTotal = computed(() => {
    return upcomingSubscriptions.value.reduce((sum, s) => sum + s.amount, 0);
  });

  // Регулярные платежи, которые уже фактически вошли в расходы месяца
  const pastSubscriptionsTotal = computed(() => {
    if (!isCurrentMonthPeriod.value) return 0;

    return subscriptions.value
      .filter((sub) => recordedSubscriptionIds.value.has(sub.id))
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
