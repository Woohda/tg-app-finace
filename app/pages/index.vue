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

// 1. Данные баланса
const balanceHistory = mockBalanceHistory; // TODO: Реализовать расчет на бэкенде
const percentChange = mockPercentChange; // TODO: Реализовать расчет на бэкенде

// 2. Данные бюджета
// Агрегируем расходы по категориям
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

  // Сортируем и берем топ-5
  const sorted = Array.from(expenseMap.entries())
    .map(([id, data]) => {
      return {
        id,
        name: data.name,
        icon: data.icon,
        amount: data.amount,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Назначаем яркие "желейные" цвета, соответствующие дизайну
  const colors = [
    "#FF514A", // Яркий красный/коралловый
    "#F42B70", // Яркий розовый/пурпурный
    "#9B44E3", // Яркий фиолетовый
    "#FF9500", // Яркий оранжевый
    "#FFD075", // Светло-желтый/персиковый
  ];

  return sorted.map((cat, index) => ({
    ...cat,
    color: colors[index % colors.length] as string,
  }));
});

// 3. Данные транзакций
const recentTransactions = computed(() => transactions.value.slice(0, 5));
</script>

<template>
  <div class="relative flex flex-col gap-5">
    <div class="flex items-center justify-between mb-1">
      <div class="flex items-center gap-3">
        <!-- Мок аватарки -->
        <div
          class="w-10 h-10 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50"
          style="box-shadow: var(--shadow-glass-flat)"
        >
          👱‍♀️
        </div>
        <p class="text-text-primary font-bold">{{ userName }}</p>
      </div>

      <!-- Иконка колокольчика -->
      <div
        class="w-10 h-10 rounded-full glass-milky flex items-center justify-center text-text-primary shrink-0"
        style="box-shadow: var(--shadow-glass-flat)"
      >
        <Bell class="w-5 h-5 text-text-secondary" />
      </div>
    </div>

    <!-- Текст приветствия -->
    <div class="mb-2">
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
    <ExpensesDonut :categories="expensesByCategory" :is-loading="pending" />

    <!-- 3. Секция последних операций -->
    <div v-if="pending" class="flex flex-col gap-4 mt-2 px-5">
      <!-- Скелетон заголовка "Последние операции" -->
      <div class="flex justify-between items-end px-1 mb-2">
        <UiSkeleton class="w-40 h-7" />
        <UiSkeleton class="w-7 h-7" />
      </div>
      <!-- Скелетоны транзакций -->
      <div
        v-for="i in 4"
        :key="i"
        class="flex items-center gap-3 bg-card-bg p-4 rounded-2xl"
      >
        <UiSkeleton class="w-10 h-10 rounded-full shrink-0" />
        <div class="flex-1 flex flex-col gap-2">
          <UiSkeleton class="w-30 h-4" />
          <UiSkeleton class="w-15 h-3" />
        </div>
        <UiSkeleton class="w-16 h-5" />
      </div>
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
