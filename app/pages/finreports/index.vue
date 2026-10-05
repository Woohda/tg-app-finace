<script setup lang="ts">
/**
 * @module app/pages/finreports
 * @fileoverview Экран финансовых отчетов и транзакций
 * @description
 * Отображает полукольцевой датчик бюджета (всегда за месяц) и список транзакций,
 * который фильтруется через Segmented Control (День, Неделя, Месяц).
 * Транзакции интерактивны: swipe-to-delete, tap-to-edit.
 * ---
 * ### Логика работы:
 * 1. Получает даты текущего выбранного месяца через `useDateFilter`.
 * 2. Загружает транзакции месяца и статус загрузки через `useTransactions`.
 * 3. Рассчитывает баланс, расходы и выполнение бюджета через `useTransactionView`.
 * 4. Верхний блок: карточка расходов/бюджета с анимацией AuroraBudget и переключателем режима.
 * 5. Делегирует отображение списка транзакций, фильтрацию и пагинацию компоненту `TransactionsOperationsList`.
 */
import { ref, computed, onMounted } from "vue";
import { formatAmount } from "~/utils/format";

const { startDate, endDate, currentDate, prevMonth, nextMonth } =
  useDateFilter();
const { pending, transactions } = useTransactions({
  startDate,
  endDate,
});
const {
  activePeriod,
  periods,
  searchQuery,
  filteredTransactions,
  emptyMessage,
  monthlyBudget,
  monthlyExpense,
  monthlyBudgetPercent,
} = useTransactionView(transactions, { currentDate });

const { fetchBudget } = useBudgets();

onMounted(() => {
  if (!monthlyBudget.value) {
    fetchBudget();
  }
});

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
    <TransactionsOperationsList
      v-model:active-period="activePeriod"
      v-model:search-query="searchQuery"
      :periods="periods"
      :transactions="filteredTransactions"
      :empty-message="emptyMessage"
      :pending="pending"
      :total-count="transactions.length"
    />
  </div>
</template>
