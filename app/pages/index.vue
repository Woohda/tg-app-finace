<script setup lang="ts">
/**
 * @module app/pages/index
 * @fileoverview Главная страница приложения (Дашборд)
 * @description
 * Отображает сводную финансовую информацию пользователя:
 * остаток бюджета, распределение расходов по категориям и список регулярных платежей за текущий месяц.
 * ---
 * ### Логика работы:
 * 1. Форматирование даты приветствия в заголовке через `formatWeekdayAndDate()`.
 * 2. Отображение карточки остатка бюджета на текущий месяц (BudgetRemainderCard).
 * 3. Отображение сводки доходов и расходов за текущий месяц (MonthlySummary).
 * 4. Визуализация распределения расходов по категориям (ExpensesDonut).
 * 5. Список регулярных платежей за текущий месяц (SubscriptionDashboardCard).
 */
import { computed, onMounted } from "vue";
import { Bell } from "@lucide/vue";

const { userName, avatarUrl } = useAuth();
const { hasUnread } = useNotifications();
const { startDate, endDate } = useDateFilter();
const {
  transactions,
  isLoading: isTxLoading,
  error: txError,
  refresh: refreshTransactions,
  fetchTransactions,
} = useTransactions({
  startDate,
  endDate,
});
const { monthlyExpense, monthlyIncome } = useTransactionView(transactions);
const { expensesByCategory } = useExpensesByCategory(transactions);

const {
  budget,
  fetchBudget,
  isLoading: budgetLoading,
  remainder: budgetRemainder,
  lastDayOfMonth,
  dailyGuideline,
} = useBudgets({ monthlyExpense });

const { fetchSubscriptions } = useSubscriptions();
const { fetchCategories } = useCategories();

const retryAll = async () => {
  await Promise.all([
    refreshTransactions(),
    fetchBudget(true),
    fetchSubscriptions(true),
    fetchCategories(true),
  ]);
};

onMounted(async () => {
  await Promise.all([
    fetchTransactions(),
    fetchBudget(),
    fetchSubscriptions(),
    fetchCategories(),
  ]);
});

const currentDate = computed(() => formatWeekdayAndDate());
</script>

<template>
  <div class="relative flex flex-col gap-4">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Avatar :src="avatarUrl" :name="userName" />
        <p class="text-text-primary font-bold">{{ userName }}</p>
      </div>

      <!-- Иконка колокольчика -->
      <!-- Notifications -->
      <NuxtLink
        to="/notifications"
        aria-label="Уведомления"
        class="w-12 h-12 rounded-full glass-pill flex items-center justify-center relative active:scale-95 transition-transform shrink-0 a11y-focus"
      >
        <Bell class="w-6 h-6 text-text-secondary" />
        <ClientOnly>
          <div
            v-if="hasUnread"
            aria-hidden="true"
            class="absolute top-2 right-2 w-2.5 h-2.5 bg-text-accent rounded-full border-2 border-[#E5E9F0]"
          />
        </ClientOnly>
      </NuxtLink>
    </header>

    <!-- Ошибка загрузки дашборда -->
    <GlassErrorState
      v-if="txError && transactions.length === 0 && !isTxLoading"
      compact
      title="Не удалось загрузить данные"
      :error="txError"
      retry-text="Повторить"
      @retry="retryAll"
    />

    <!-- Текст приветствия -->
    <div class="flex flex-col gap-2">
      <div class="flex flex-col pl-5">
        <p class="text-lg text-text-secondary tracking-tight -mb-1.5">
          Привет, сегодня
        </p>
        <h1 class="text-[24px] text-text-primary tracking-tight">
          {{ currentDate }}
        </h1>
      </div>

      <!-- 1. Сводка остатка бюджета -->
      <BudgetRemainderCard
        v-if="budgetLoading || (budget && budget > 0)"
        :remainder="budgetRemainder"
        :daily-guideline="dailyGuideline"
        :last-day-of-month="lastDayOfMonth"
        :is-loading="budgetLoading || isTxLoading"
      />
    </div>

    <!-- 2. Сводка доходов и расходов -->
    <MonthlySummary
      :income="monthlyIncome"
      :expense="monthlyExpense"
      :is-loading="isTxLoading"
    />

    <!-- Главный контент: Топ-5 категорий расходов -->
    <ExpensesDonut
      v-if="isTxLoading || transactions.length > 0"
      :categories="expensesByCategory"
      :total-expense="monthlyExpense"
      :is-loading="isTxLoading"
    />

    <!-- Регулярные ежемесячные платежи -->
    <SubscriptionDashboardCard />
  </div>
</template>
