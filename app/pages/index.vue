<script setup lang="ts">
/**
 * @module app/pages/index
 * @fileoverview Главная страница приложения (Дашборд)
 * @description
 * Отображает сводную финансовую информацию пользователя:
 * - Приветствие пользователя
 * - Общий баланс и мини-график истории (BalanceCard)
 * - Распределение топ-5 расходов по категориям (ExpensesDonut)
 * - Список последних транзакций
 */
import { computed } from "vue";
import { getGreeting } from "~/utils";
import BalanceCard from "~/components/dashboard/BalanceCard.vue";
import ExpensesDonut from "~/components/dashboard/ExpensesDonut.vue";
import TransactionItem from "~/components/TransactionItem.vue";
import { Bell, ReceiptText } from "@lucide/vue";
// Импорт моков для истории баланса (пока не реализован расчет исторического баланса)
import { mockBalanceHistory, mockPercentChange } from "~/mocks/dashboard";

const { user } = useAuth();
const { transactions, pending } = useTransactions();
const { balance } = useTransactionView(transactions);

const greeting = getGreeting();
const userName = computed(() => {
  if (user.value?.username) {
    return `@${user.value.username}`;
  }
  return "Пользователь";
});

// 1. Balance Data
const balanceHistory = mockBalanceHistory; // TODO: Реализовать расчет на бэкенде
const percentChange = mockPercentChange; // TODO: Реализовать расчет на бэкенде

// 2. Budget Data
// Aggregate expenses by category
const expensesByCategory = computed(() => {
  const expenseMap = new Map<string, { amount: number; name: string }>();

  transactions.value
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const current = expenseMap.get(t.categoryId) || { amount: 0, name: t.categoryName };
      current.amount += t.amount;
      expenseMap.set(t.categoryId, current);
    });

  // Sort and take top 5
  const sorted = Array.from(expenseMap.entries())
    .map(([id, data]) => {
      return {
        id,
        name: data.name,
        amount: data.amount,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Assign neumorphic/sunset colors
  const colors = [
    "#ef4530", // accent-end
    "#fc5c47", // accent-mid
    "#ff7e67", // accent-start
    "#c6bcb5", // warm dark cream
    "#9a948f", // text-secondary
  ];

  return sorted.map((cat, index) => ({
    ...cat,
    color: colors[index % colors.length] as string,
  }));
});

// 3. Transactions Data
const recentTransactions = computed(() => transactions.value.slice(0, 5));
</script>

<template>
  <div class="relative flex flex-col gap-5">
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center gap-3">
        <!-- Avatar mock -->
        <div
          class="w-10 h-10 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50"
          style="box-shadow: var(--shadow-glass-flat)"
        >
          👱‍♀️
        </div>
        <p class="text-text-primary font-bold">Привет, {{ userName }} 👋</p>
      </div>

      <!-- Bell Icon -->
      <div
        class="w-10 h-10 rounded-full glass-milky flex items-center justify-center text-text-primary shrink-0"
        style="box-shadow: var(--shadow-glass-flat)"
      >
        <Bell class="w-5 h-5 text-text-secondary" />
      </div>
    </div>

    <!-- Greeting texts -->
    <div class="mb-2">
      <h1 class="text-3xl font-extrabold text-text-primary tracking-tight">
        {{ greeting.replace(",", "") }}!
      </h1>
      <p class="text-text-secondary text-sm font-medium mt-1">
        Ваш финансовый обзор
      </p>
    </div>

    <!-- 1. Balance Section -->
    <BalanceCard
      :balance="balance"
      :percent-change="percentChange"
      :history="balanceHistory"
    />

    <!-- Loading State -->
    <div v-if="pending" class="flex justify-center items-center py-10 text-text-secondary">
      Загрузка...
    </div>
    
    <template v-else>
      <!-- 2. Budget Section -->
      <ExpensesDonut :categories="expensesByCategory" />

      <!-- 3. Recent Activity Section -->
      <div class="flex flex-col gap-4 mt-2 px-5">
        <div class="flex justify-between items-end px-1">
          <h3 class="text-lg font-extrabold text-text-primary">
            Последние операции
          </h3>
          <NuxtLink to="/finreports" class="text-text-secondary">
            <ReceiptText :stroke-width="1.5" />
          </NuxtLink>
        </div>

        <div v-if="recentTransactions.length === 0" class="text-center py-4 text-text-secondary">
          Пока нет транзакций
        </div>
        <div v-else class="flex flex-col gap-4">
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
    </template>
  </div>
</template>
