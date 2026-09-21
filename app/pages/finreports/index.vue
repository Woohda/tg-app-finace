<script setup lang="ts">
/**
 * @module app/pages/finreports
 * @fileoverview Экран финансовых отчетов и транзакций
 * @description
 * Отображает полукольцевой датчик бюджета (всегда за месяц) и список транзакций,
 * который фильтруется через Segmented Control (День, Неделя, Месяц).
 * Транзакции интерактивны: swipe-to-delete, tap-to-edit.
 */

import { useTransactionModal } from "~/composables/useTransactionModal";

const { openModal } = useTransactionModal();

const { startDate, endDate, currentDate, prevMonth, nextMonth } =
  useDateFilter();
const { pending, transactions, deleteTransaction } = useTransactions({
  startDate,
  endDate,
});
const {
  activePeriod,
  periods,
  filteredTransactions,
  emptyMessage,
  monthlyBudget,
  monthlyExpense,
  monthlyBudgetPercent,
} = useTransactionView(transactions, { currentDate });

const deletingId = ref<string | null>(null);

async function handleDelete(id: string) {
  deletingId.value = id;
  await deleteTransaction(id);
  deletingId.value = null;
}

function handleEdit(id: string) {
  openModal(id);
}

type ViewMode = "budget" | "spent";
const viewMode = ref<ViewMode>("spent");

const currentAmount = computed(() =>
  viewMode.value === "budget" ? monthlyBudget.value : monthlyExpense.value,
);

const currentLabel = computed(() =>
  viewMode.value === "budget" ? "Бюджет на этот месяц" : "Потрачено за период",
);
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-center gap-3">
      <div class="flex flex-col text-center">
        <h1 class="text-text-primary text-xl font-bold tracking-tight">
          Финансовый отчет
        </h1>
        <p class="text-text-secondary text-xs">
          Отчет о ваших тратах и всех транзакциях
        </p>
      </div>
    </div>

    <!-- Селектор месяца -->
    <MonthSelector :date="currentDate" @prev="prevMonth" @next="nextMonth" />

    <GlassCard
      class="flex flex-col justify-between relative overflow-hidden h-38"
    >
      <div class="z-10 relative pointer-events-none">
        <!-- Состояние загрузки: Скелетоны текста -->
        <div
          v-if="pending"
          class="flex flex-col gap-2 py-1"
        >
          <Skeleton class="w-30 h-4" />
          <Skeleton class="w-40 h-9" />
          <Skeleton class="w-20 h-3" />
        </div>

        <div v-else class="fade-in">
          <p class="text-text-secondary text-[12px] font-semibold mb-1">
            {{ currentLabel }}
          </p>
          <h2 class="text-3xl font-extrabold text-text-primary tracking-tight">
            {{ formatAmount(currentAmount) }}
          </h2>
        </div>
      </div>

      <!-- Переключатель режима: Бюджет / Потрачено -->
      <div class="z-20 relative">
        <GlassSegmentedControl
          v-model="viewMode"
          :options="[
            { id: 'spent', label: 'Траты' },
            { id: 'budget', label: 'Бюджет' },
          ]"
          size="sm"
          class="w-44 h-8"
        />
      </div>

      <!-- Фоновое "дышащее" пятно Aurora -->
      <AuroraBudget
        :percent="monthlyBudgetPercent"
        :budget="monthlyBudget"
        :spent="monthlyExpense"
        class="z-0"
      />
    </GlassCard>

    <!-- Финансовый раздел: Список операций -->
    <GlassCard class="relative z-10 pb-0">
      <div class="flex flex-col gap-3 mb-5">
        <h2 class="text-lg font-bold text-text-primary tracking-tight">
          Записанные транзакции
        </h2>

        <!-- Переключатель периодов -->
        <GlassSegmentedControl
          v-model="activePeriod"
          :options="periods"
          size="md"
        />
      </div>

      <!-- Скелетоны транзакций (загрузка) -->
      <div
        v-if="pending"
        class="flex flex-col gap-3"
      >
        <TransactionSkeletonList :count="4" mode="list" />
      </div>

      <!-- Список транзакций -->
      <div
        v-else-if="filteredTransactions.length > 0"
        class="flex flex-col gap-3"
      >
        <TransactionItem
          v-for="tx in filteredTransactions"
          :key="tx.id"
          v-memo="[tx.id, tx.amount, tx.name, tx.date, tx.categoryIcon, tx.type, deletingId === tx.id]"
          :icon="tx.categoryIcon"
          :title="tx.name || tx.categoryName"
          :subtitle="tx.name ? tx.categoryName : ''"
          :amount="tx.amount"
          :type="tx.type"
          :date="tx.date"
          interactive
          :class="{ 'opacity-50 pointer-events-none': deletingId === tx.id }"
          @click="handleEdit(tx.id)"
          @delete="handleDelete(tx.id)"
        />
      </div>

      <!-- Пустое состояние при отсутствии трат -->
      <div
        v-else
        class="flex flex-col items-center justify-start text-start pb-5"
      >
        <p class="text-text-secondary text-md font-medium">
          {{ emptyMessage }}
        </p>
      </div>
    </GlassCard>
  </div>
</template>
