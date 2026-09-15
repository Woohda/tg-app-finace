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
import { computed } from "vue";
import { getGreeting } from "~/utils";
import { Bell, ReceiptText } from "@lucide/vue";

const { user, tgUser } = useAuth();
const { transactions, pending } = useTransactions();
const { balance, monthlyExpense } = useTransactionView(transactions);
const { balanceHistory, expensesByCategory, recentTransactions, dashboardStats } =
  useDashboardStats(transactions);

const greeting = getGreeting();
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

// 1. Данные баланса (используем реальный текущий баланс)
// TODO: Расчет исторического графика по дням на бэкенде. Пока строим кумулятивный график из транзакций
const percentChange = computed(() => dashboardStats.value?.percentChange || 0);
</script>

<template>
  <div class="relative flex flex-col gap-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Avatar :src="avatarUrl" />
        <p class="text-text-primary font-bold">{{ userName }}</p>
      </div>

      <!-- Иконка колокольчика -->
      <div
        class="w-12 h-12 rounded-full glass-milky flex items-center justify-center text-text-primary shrink-0"
        style="box-shadow: var(--shadow-glass-flat)"
      >
        <Bell class="w-6 h-6 text-text-secondary" />
      </div>
    </div>

    <!-- Текст приветствия -->
    <div>
      <h1 class="text-3xl font-extrabold text-text-primary tracking-tight">
        {{ greeting.replace(",", "") }}!
      </h1>
      <p class="text-text-secondary text-sm font-medium mt-1">
        Ваш финансовый обзор
      </p>
    </div>

    <!-- 1. Секция баланса -->
    <BalanceCard
      :balance="balance"
      :percent-change="percentChange"
      :history="balanceHistory"
      :is-loading="pending"
    />

    <!-- Главный контент: Топ-5 категорий расходов -->
    <ExpensesDonut
      v-if="transactions.length > 0"
      :categories="expensesByCategory"
      :total-expense="monthlyExpense"
      :is-loading="pending"
    />

    <!-- 3. Секция последних операций -->
    <div v-if="pending" class="flex flex-col gap-4 mt-2 px-5">
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
        <NuxtLink to="/finreports" class="text-text-secondary">
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
          :icon="item.categoryIcon"
          :name="item.categoryName"
          :amount="item.amount"
          :type="item.type"
          :date="item.date"
        />
      </div>
    </div>
  </div>
</template>
