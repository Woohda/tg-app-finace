<script setup lang="ts">
/**
 * @module app/pages/index
 * @fileoverview Главная страница приложения (Дашборд)
 * @description
 * Отображает сводную финансовую информацию пользователя:
 * - Общий баланс и мини-график истории (BalanceCard)
 * - Распределение топ-5 расходов по категориям (ExpensesDonut)
 * - Список последних транзакций
 */
import { computed, onMounted } from "vue";
import { Bell, ReceiptText } from "@lucide/vue";

const { user, tgUser } = useAuth();
const { hasUnread } = useNotifications();
const { startDate, endDate } = useDateFilter();
const { transactions, pending } = useTransactions({ startDate, endDate });
const { monthlyExpense, monthlyIncome } = useTransactionView(transactions);
const { balanceHistory, expensesByCategory, recentTransactions } =
  useDashboardStats(transactions);

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

const currentDate = computed(() => {
  const d = new Date();
  const weekday = d.toLocaleDateString("ru-RU", { weekday: "long" });
  const dayMonth = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
  return `${weekday}, ${dayMonth}`;
});

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

// // 1. Данные баланса (используем реальный текущий баланс)
// const percentChange = computed(() => dashboardStats.value?.percentChange || 0);
</script>

<template>
  <div class="relative flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Avatar :src="avatarUrl" />
        <p class="text-text-primary font-bold">{{ userName }}</p>
      </div>

      <!-- Иконка колокольчика -->
      <!-- Notifications -->
      <NuxtLink
        to="/notifications"
        class="w-12 h-12 rounded-full glass-milky flex items-center justify-center relative active:scale-95 transition-transform shrink-0 a11y-focus border-[0.5px] border-white/50"
      >
        <Bell class="w-6 h-6 text-text-secondary" />
        <ClientOnly>
          <div
            v-if="hasUnread"
            class="absolute top-2 right-2 w-2.5 h-2.5 bg-text-accent rounded-full border-2 border-[#E5E9F0]"
          />
        </ClientOnly>
      </NuxtLink>
    </div>

    <!-- Текст приветствия -->
    <div class="flex flex-col gap-2">
      <div class="flex flex-col pl-5">
        <p class="text-lg text-text-secondary tracking-tight -mb-1.5">
          Привет, сегодня
        </p>
        <p class="text-[24px] text-text-primary tracking-tight">
          {{ currentDate }}
        </p>
      </div>

      <!-- 1. Секция баланса (Остаток бюджета) -->
      <BalanceCard
        v-if="budget"
        :amount="budgetRemainder"
        :daily-guideline="dailyGuideline"
        :last-day-of-month="lastDayOfMonth"
        :history="balanceHistory"
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

    <!-- 3. Секция последних операций -->
    <div
      v-if="pending && transactions.length === 0"
      class="flex flex-col gap-4 mt-2 px-5"
    >
      <!-- Скелетон заголовка "Последние операции" -->
      <div class="flex justify-between items-end px-1 mb-2">
        <Skeleton class="w-50 h-6" />
        <Skeleton class="w-7 h-7" />
      </div>
      <!-- Скелетоны транзакций -->
      <TransactionSkeletonList :count="4" />
    </div>
    <div v-else class="flex flex-col gap-4 mt-2 px-5">
      <div class="flex justify-between items-end px-1">
        <h3 class="text-lg font-extrabold text-text-primary">
          Последние операции
        </h3>
        <NuxtLink
          to="/finreports"
          class="text-text-secondary rounded-md a11y-focus"
        >
          <ReceiptText :stroke-width="1.5" />
        </NuxtLink>
      </div>

      <div
        v-if="recentTransactions.length === 0"
        class="text-center py-4 text-text-secondary"
      >
        Пока нет транзакций
      </div>
      <div v-else class="flex flex-col gap-3">
        <TransactionItem
          v-for="item in recentTransactions"
          :key="item.id"
          v-memo="[
            item.id,
            item.amount,
            item.name,
            item.date,
            item.categoryIcon,
            item.type,
          ]"
          :icon="item.categoryIcon"
          :title="item.name || item.categoryName"
          :amount="item.amount"
          :type="item.type"
          :date="item.date"
        />
      </div>
    </div>
  </div>
</template>
