<script setup lang="ts">
/**
 * @module app/components/analytics/CategoryAnalyticsModal
 * @fileoverview Детальная аналитика по одной категории
 * @description
 * Модальное окно, показывающее динамику трат (график), инсайты
 * и список операций конкретно для выбранной категории за текущий месяц.
 * ---
 * ### Логика работы:
 * 1. Получает `categoryId` и `period` из пропсов.
 * 2. Вызывает `useAnalyticsData` с фильтром по `categoryId`.
 * 3. Фильтрует операции категории за текущий месяц через `filterCurrentMonthCategoryTransactions`.
 * 4. Отрисовывает `AnalyticsBarChart`, метрики и список операций месяца под графиком.
 */
import { toRef, computed, ref } from "vue";
import { TrendingUp, TrendingDown } from "@lucide/vue";
import type { AnalyticsPeriodType } from "~/composables/useAnalyticsPeriod";
import { formatAmount } from "~/utils/format";

const props = defineProps<{
  isOpen: boolean;
  categoryId: string | null;
  period: AnalyticsPeriodType;
}>();

const emit = defineEmits(["close"]);

const { startDate, endDate, prevStartDate, prevEndDate } = useAnalyticsPeriod();
const {
  transactions,
  pending: pendingTransactions,
  deleteTransaction,
} = useTransactions();
const { openModal } = useTransactionModal();

const localPeriod = toRef(props, "period");

const { pending, totalSpent, percentChange, chartData, categoryStats } =
  useAnalyticsData(
    localPeriod,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    toRef(props, "categoryId"),
  );

const filteredTransactions = computed(() =>
  filterCurrentMonthCategoryTransactions(transactions.value, props.categoryId),
);

const deletingId = ref<string | null>(null);

async function handleDelete(id: string) {
  deletingId.value = id;
  await deleteTransaction(id);
  deletingId.value = null;
}

function handleEdit(id: string) {
  openModal(id);
}

const prevPeriodLabel = computed(() => {
  switch (localPeriod.value) {
    case "1W":
      return "К прошлой неделе";
    case "1M":
      return "К прошлому месяцу";
    case "3M":
      return "К прошлым 3 мес";
    case "6M":
      return "К прошлому полугодию";
    case "1Y":
      return "К прошлому году";
    default:
      return "К прошлому";
  }
});

// Получаем инфу о категории из stats (там будет ровно 1 элемент)
const currentCategory = computed(() => {
  if (categoryStats.value.length > 0) return categoryStats.value[0];
  return null;
});

const close = () => emit("close");
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    position="bottom"
    :z-index="Z_INDEX.CATEGORY_ANALYTICS"
    @close="close"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-11 h-11 flex items-center justify-center bg-white/50 rounded-full shadow-sm text-base"
        >
          {{ currentCategory?.categoryIcon || "📂" }}
        </div>
        <div class="flex flex-col">
          <h2 class="text-text-primary text-base font-bold tracking-tight">
            {{ currentCategory?.categoryName || "Категория" }}
          </h2>
          <p
            class="text-text-secondary text-xs uppercase tracking-wide font-semibold mt-0.5"
          >
            Аналитика
          </p>
        </div>
      </div>
    </template>
    <div class="flex flex-col gap-5">
      <!-- Лоадер -->
      <div v-if="pending" class="flex flex-col gap-4">
        <Skeleton class="w-full h-24 rounded-2xl" />
        <Skeleton class="w-full h-48 rounded-2xl" />
      </div>

      <div v-else class="flex flex-col gap-5">
        <!-- Сводка -->
        <GlassCard class="p-4 flex justify-between items-center">
          <div class="flex flex-col gap-1">
            <p
              class="text-text-secondary text-[10px] uppercase font-bold tracking-wide"
            >
              Траты за период
            </p>
            <span
              class="text-text-primary text-2xl font-extrabold tracking-tighter"
              >{{ formatAmount(totalSpent) }}</span
            >
          </div>

          <div class="flex flex-col items-end gap-1">
            <p
              class="text-text-secondary text-[10px] uppercase font-bold tracking-wide"
            >
              {{ prevPeriodLabel }}
            </p>
            <div class="flex items-center gap-1">
              <div
                class="mt-0.5 p-1 rounded-full bg-white/5 shadow-sm border border-white/10"
              >
                <component
                  :is="percentChange > 0 ? TrendingUp : TrendingDown"
                  class="w-4 h-4"
                  :class="
                    percentChange > 0 ? 'text-text-accent' : 'text-text-success'
                  "
                />
              </div>
              <span
                class="text-sm font-bold"
                :class="
                  percentChange > 0 ? 'text-text-accent' : 'text-text-success'
                "
              >
                {{ percentChange > 0 ? "+" : "" }}{{ percentChange }}%
              </span>
            </div>
          </div>
        </GlassCard>

        <!-- График -->
        <GlassCard class="p-5 flex flex-col gap-4">
          <h2
            class="text-text-primary font-bold text-sm uppercase tracking-wide"
          >
            Динамика по категории
          </h2>
          <AnalyticsBarChart :data="chartData" />
        </GlassCard>

        <!-- Операции за текущий месяц -->
        <GlassCard class="p-4 flex flex-col gap-3 pb-0">
          <div class="flex justify-between items-center px-1">
            <h3
              class="text-text-primary font-bold text-sm uppercase tracking-wide"
            >
              Операции за месяц
            </h3>
            <span class="text-text-secondary text-xs font-semibold">
              {{ filteredTransactions.length }}
            </span>
          </div>

          <!-- Скелетоны транзакций (загрузка) -->
          <div v-if="pendingTransactions" class="flex flex-col gap-3">
            <TransactionSkeletonList :count="3" mode="list" />
          </div>

          <!-- Список транзакций -->
          <div
            v-else-if="filteredTransactions.length > 0"
            class="flex flex-col gap-3"
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
              :class="{
                'opacity-50 pointer-events-none': deletingId === tx.id,
              }"
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
              В этом месяце операций по категории ещё не было
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  </GlassModal>
</template>
