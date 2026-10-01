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
import { Search, X } from "@lucide/vue";

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
  searchQuery,
  filteredTransactions,
  filteredExpense,
  filteredIncome,
  filteredCount,
  emptyMessage,
  monthlyBudget,
  monthlyExpense,
  monthlyBudgetPercent,
} = useTransactionView(transactions, { currentDate });

const { fetchBudget } = useBudgets();

/**
 * Форматированная сумма отфильтрованных операций.
 */
const filteredAmountText = computed(() => {
  if (filteredCount.value === 0) return "";
  if (filteredExpense.value > 0 && filteredIncome.value > 0) {
    return `−${formatAmount(filteredExpense.value)} / +${formatAmount(filteredIncome.value)}`;
  }
  if (filteredIncome.value > 0) {
    return `+${formatAmount(filteredIncome.value)}`;
  }
  return `−${formatAmount(filteredExpense.value)}`;
});

/**
 * Текст бейджа в шапке списка транзакций (количество и сумма).
 */
const summaryBadgeText = computed(() => {
  if (filteredCount.value === 0) {
    return searchQuery.value.trim() ? "Найдено: 0" : "";
  }
  if (searchQuery.value.trim()) {
    return `Найдено: ${filteredCount.value} • ${filteredAmountText.value}`;
  }
  return `${filteredCount.value} оп. • ${filteredAmountText.value}`;
});

onMounted(() => {
  if (!monthlyBudget.value) {
    fetchBudget();
  }
});

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
    <div class="flex flex-col text-center">
      <h1 class="text-text-primary text-xl font-bold tracking-wide">
        Финансовый отчет
      </h1>
      <p class="text-text-secondary text-xs">
        Отчет о ваших тратах и всех транзакциях
      </p>
    </div>

    <!-- Селектор месяца -->
    <MonthSelector :date="currentDate" @prev="prevMonth" @next="nextMonth" />

    <GlassCard
      class="flex flex-col justify-between relative overflow-hidden h-38"
    >
      <div class="z-10 relative pointer-events-none">
        <!-- Состояние загрузки: Скелетоны текста -->
        <div v-if="pending" class="flex flex-col gap-2 py-1">
          <Skeleton class="w-30 h-4" />
          <Skeleton class="w-40 h-9" />
          <Skeleton class="w-20 h-3" />
        </div>

        <div v-else class="fade-in">
          <p
            class="text-text-secondary text-[13px] font-medium mb-1 tracking-wide"
          >
            {{ currentLabel }}
          </p>
          <h2 class="text-3xl font-extrabold text-text-primary">
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
    <GlassCard class="relative z-10 pb-2">
      <div class="flex flex-col gap-3 mb-3">
        <div class="flex items-center justify-between gap-2">
          <h2
            class="text-base font-bold text-text-primary uppercase tracking-wide truncate"
          >
            Все транзакции:
          </h2>
          <span
            v-if="summaryBadgeText"
            class="text-xs font-semibold text-text-secondary glass-pill px-2.5 py-0.5 rounded-full shrink-0 max-w-[80%] truncate text-right"
          >
            {{ summaryBadgeText }}
          </span>
        </div>

        <!-- Переключатель периодов -->
        <GlassSegmentedControl
          v-model="activePeriod"
          :options="periods"
          size="md"
        />
        <!-- Поисковая строка -->
        <div
          v-if="filteredTransactions.length > 10"
          class="relative flex items-center w-full"
        >
          <GlassInput
            v-model="searchQuery"
            type="text"
            inputmode="search"
            placeholder="Поиск по названию или категории..."
            :icon="Search"
            class="w-full text-sm"
          />
          <button
            v-if="searchQuery"
            type="button"
            aria-label="Очистить поиск"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 cursor-pointer"
            @click="searchQuery = ''"
          >
            <X class="size-5" />
          </button>
        </div>
      </div>

      <!-- Скелетоны транзакций (загрузка) -->
      <div v-if="pending" class="flex flex-col gap-3">
        <TransactionSkeletonList :count="4" mode="list" />
      </div>

      <!-- Список транзакций -->
      <div
        v-else-if="filteredTransactions.length > 0"
        class="flex flex-col gap-2"
      >
        <TransactionItem
          v-for="tx in filteredTransactions"
          :key="tx.id"
          v-memo="[
            tx.id,
            tx.amount,
            tx.name,
            tx.date,
            tx.categoryIcon,
            tx.type,
            deletingId === tx.id,
          ]"
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
        class="flex flex-col items-center justify-center text-center pb-5 gap-2"
      >
        <p class="text-text-secondary text-sm font-medium">
          {{ emptyMessage }}
        </p>
        <button
          v-if="searchQuery.trim()"
          type="button"
          class="text-xs font-semibold text-text-accent active:scale-95 transition-transform underline underline-offset-3 cursor-pointer"
          @click="searchQuery = ''"
        >
          Сбросить поиск
        </button>
      </div>
    </GlassCard>
  </div>
</template>
