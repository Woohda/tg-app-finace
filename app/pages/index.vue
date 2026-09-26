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

const { user, tgUser } = useAuth();
const { hasUnread } = useNotifications();
const { startDate, endDate } = useDateFilter();
const { transactions, pending } = useTransactions({ startDate, endDate });
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

onMounted(() => {
  if (!budget.value) {
    fetchBudget();
  }
});

const currentDate = computed(() => formatWeekdayAndDate());

const userName = computed(() => {
  if (tgUser.value?.first_name) {
    return tgUser.value.first_name;
  }
  if (user.value?.username) {
    return `@${user.value.username}`;
  }
  return "Пользователь";
});

const avatarUrl = computed(() => tgUser.value?.photo_url || null);
</script>

<template>
  <div class="relative flex flex-col gap-4">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Avatar :src="avatarUrl" />
        <p class="text-text-primary font-bold">{{ userName }}</p>
      </div>

      <!-- Иконка колокольчика -->
      <!-- Notifications -->
      <NuxtLink
        to="/notifications"
        aria-label="Уведомления"
        class="w-12 h-12 rounded-full glass-milky flex items-center justify-center relative active:scale-95 transition-transform shrink-0 a11y-focus border-[0.5px] border-white/50"
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
        v-if="budget"
        :remainder="budgetRemainder"
        :daily-guideline="dailyGuideline"
        :last-day-of-month="lastDayOfMonth"
        :is-loading="pending || budgetLoading"
      />
    </div>

    <!-- 2. Сводка доходов и расходов -->
    <MonthlySummary :income="monthlyIncome" :expense="monthlyExpense" />

    <!-- Главный контент: Топ-5 категорий расходов -->
    <ExpensesDonut
      v-if="transactions.length > 0"
      :categories="expensesByCategory"
      :total-expense="monthlyExpense"
      :is-loading="pending"
    />

    <!-- Регулярные ежемесячные платежи -->
    <SubscriptionDashboardCard />
  </div>
</template>
