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
 * 3. Сопоставление фактических трат и предстоящих подписок через `matchSubscriptionsWithExpenses` (по категории, сумме и названию).
 * 4. Вычисление средних ежедневных переменных трат (`avgDailyVariable = (totalSpent - pastSubscriptionsTotal) / daysPassed`).
 * 5. Расчет итогового прогноза: `totalSpent + avgDailyVariable * remainingDays + upcomingSubscriptionsTotal`.
 */
import { computed, onMounted } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { Transaction } from "./useTransactions";
import { matchSubscriptionsWithExpenses } from "~/utils/analytics";

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

  // Сопоставление регулярных платежей с фактическими расходами текущего месяца
  const matchResult = computed(() => {
    if (!isCurrentMonthPeriod.value) {
      return {
        recordedIds: new Set<string>(),
        upcomingSubscriptions: [],
        upcomingTotal: 0,
        pastTotal: 0,
      };
    }
    return matchSubscriptionsWithExpenses(
      currentExpenses.value,
      subscriptions.value,
      categoryId?.value,
    );
  });

  // Плановые регулярные платежи текущего месяца, которые ещё предстоит списать
  const upcomingSubscriptions = computed(
    () => matchResult.value.upcomingSubscriptions,
  );

  const upcomingSubscriptionsTotal = computed(
    () => matchResult.value.upcomingTotal,
  );

  // Регулярные платежи, которые уже фактически вошли в расходы месяца
  const pastSubscriptionsTotal = computed(() => matchResult.value.pastTotal);

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
