<script setup lang="ts">
/**
 * @module app/pages/finreports
 * @fileoverview Экран финансовых отчетов и транзакций
 * @description
 * Отображает полукольцевой датчик бюджета (всегда за месяц) и список транзакций,
 * который фильтруется через Segmented Control (День, Неделя, Месяц).
 */
import { ChevronLeft } from "@lucide/vue";
import { useTransactions } from "~/composables/useTransactions";

const {
  activePeriod,
  periods,
  filteredTransactions,
  emptyMessage,
  monthlyBudget,
  monthlyExpense,
  monthlyBudgetPercent,
} = useTransactions();
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="relative flex items-center justify-center">
      <NuxtLink to="/" class="w-7 absolute top-px -left-1 text-text-secondary">
        <ChevronLeft class="size-7" :stroke-width="1.75" />
      </NuxtLink>
      <h1 class="text-text-primary font-medium text-xl tracking-wide">
        Финансовый отчет
      </h1>
    </div>

    <!-- Центральный Датчик (Бюджет рассчитывается ТОЛЬКО на месяц) -->
    <div class="flex-1 flex flex-col items-center justify-center relative mb-5">
      <BudgetGauge
        :percent="monthlyBudgetPercent"
        :budget="monthlyBudget"
        :spent="monthlyExpense"
      />
    </div>

    <!-- Финансовый раздел: Список операций -->
    <NeuCard class="relative z-10 p-5">
      <div class="flex flex-col gap-4 mb-5">
        <h2 class="text-base font-bold text-text-primary tracking-tight">
          Записанные транзакции
        </h2>

        <!-- Переключатель периодов -->
        <NeuSegmentedControl
          v-model="activePeriod"
          :options="periods"
          size="md"
        />
      </div>

      <!-- Список транзакций -->
      <div v-if="filteredTransactions.length > 0" class="flex flex-col gap-3">
        <TransactionItem
          v-for="tx in filteredTransactions"
          :key="tx.id"
          :icon="tx.categoryIcon"
          :name="tx.categoryName"
          :amount="tx.amount"
          :type="tx.type"
          :date="tx.date"
        />
      </div>

      <!-- Пустое состояние при отсутствии трат -->
      <div v-else class="flex flex-col items-center justify-start text-start">
        <p class="text-text-secondary text-md font-medium">
          {{ emptyMessage }}
        </p>
      </div>
    </NeuCard>
  </div>
</template>
