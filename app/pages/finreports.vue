<script setup lang="ts">
/**
 * @module app/pages/finreports
 * @fileoverview Экран финансовых отчетов и транзакций
 * @description
 * Отображает полукольцевой датчик бюджета (всегда за месяц) и список транзакций,
 * который фильтруется через Segmented Control (День, Неделя, Месяц).
 * Транзакции интерактивны: swipe-to-delete, tap-to-edit.
 */
import { ChevronLeft } from "@lucide/vue";

const router = useRouter();

const { pending, transactions, deleteTransaction } = useTransactions();
const {
  activePeriod,
  periods,
  filteredTransactions,
  emptyMessage,
  monthlyBudget,
  monthlyExpense,
  monthlyBudgetPercent,
} = useTransactionView(transactions);

const deletingId = ref<string | null>(null);

async function handleDelete(id: string) {
  deletingId.value = id;
  await deleteTransaction(id);
  deletingId.value = null;
}

function handleEdit(id: string) {
  router.push(`/add?edit=${id}`);
}

type ViewMode = "budget" | "spent";
const viewMode = ref<ViewMode>("spent");

const currentAmount = computed(() =>
  viewMode.value === "budget" ? monthlyBudget.value : monthlyExpense.value,
);

const currentLabel = computed(() =>
  viewMode.value === "budget" ? "Бюджет на этот месяц" : "Потрачено за месяц",
);
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="relative flex items-center justify-center">
      <NuxtLink to="/" class="w-7 absolute top-px -left-1 text-text-secondary">
        <ChevronLeft class="size-7" :stroke-width="1.75" />
      </NuxtLink>
      <h1 class="text-text-primary font-medium text-xl tracking-wide">
        Финансовый отчет
      </h1>
    </div>

    <GlassCard class="flex flex-col gap-1 relative overflow-hidden h-49">
      <div class="z-10 flex justify-between items-start">
        <!-- Состояние загрузки: Скелетоны текста -->
        <div v-if="pending" class="flex flex-col gap-2 py-1">
          <UiSkeleton class="w-30 h-4" />
          <UiSkeleton class="w-40 h-9 rounded-lg" />
          <UiSkeleton class="w-20 h-3" />
        </div>

        <!-- Загруженное состояние: Текст баланса -->
        <div v-else class="fade-in">
          <p class="text-text-secondary text-sm font-semibold mb-px">
            {{ currentLabel }}
          </p>
          <h2 class="text-3xl font-extrabold text-text-primary tracking-tight">
            {{ formatAmount(currentAmount) }}
          </h2>
        </div>
      </div>
      <BudgetGauge
        :percent="monthlyBudgetPercent"
        :budget="monthlyBudget"
        :spent="monthlyExpense"
        class="absolute top-15 left-13"
      />
      <!-- Переключатель режима: Бюджет / Потрачено -->
      <GlassSegmentedControl
        v-model="viewMode"
        :options="[
          { id: 'spent', label: 'Траты' },
          { id: 'budget', label: 'Бюджет' },
        ]"
        size="sm"
        class="w-37 h-8 mt-2 absolute left-24 bottom-5 -translate-x-1/2"
      />
    </GlassCard>

    <!-- Финансовый раздел: Список операций -->
    <GlassCard class="relative z-10">
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
      <div v-if="pending" class="flex flex-col gap-3">
        <div
          v-for="i in 4"
          :key="i"
          class="flex items-center gap-3 pb-3 border-b border-black/6 last:border-none"
        >
          <UiSkeleton class="w-12 h-12" rounded="rounded-2xl" />
          <div class="flex-1 flex flex-col gap-2">
            <UiSkeleton class="w-35 h-4" />
            <UiSkeleton class="w-15 h-3" />
          </div>
          <UiSkeleton class="w-17 h-5" rounded="rounded-2xl" />
        </div>
      </div>

      <!-- Список транзакций -->
      <div
        v-else-if="filteredTransactions.length > 0"
        class="flex flex-col gap-3"
      >
        <TransactionItem
          v-for="tx in filteredTransactions"
          :key="tx.id"
          :icon="tx.categoryIcon"
          :name="tx.categoryName"
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
      <div v-else class="flex flex-col items-center justify-start text-start">
        <p class="text-text-secondary text-md font-medium">
          {{ emptyMessage }}
        </p>
      </div>
    </GlassCard>
  </div>
</template>
