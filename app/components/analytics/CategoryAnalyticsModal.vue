<script setup lang="ts">
/**
 * @module app/components/analytics/CategoryAnalyticsModal
 * @fileoverview Детальная аналитика по отдельной категории
 * @description
 * Модальное окно, отображающее сводку расходов, управление месячным лимитом трат,
 * динамику расходов на графике и список операций по выбранной категории.
 * Поддерживает режим просмотра архивных месяцев с автоматической адаптацией UI.
 * ---
 * ### Логика работы:
 * 1. Получает `categoryId`, `period` и опциональную дату `selectedDate` из пропсов.
 * 2. Синхронизирует интервалы дат и статус выбранного месяца через `useAnalyticsPeriod`.
 * 3. Запрашивает агрегированные данные категории через `useAnalyticsData`, рассчитывая честную разницу расходов.
 * 4. Для текущего месяца отображает виджет цели `CategoryGoalCard` и переключатель на предыдущий период.
 * 5. Для архивных месяцев скрывает виджет цели и кнопку прошлого периода, сопоставляя траты напрямую с текущим месяцем.
 * 6. Отрисовывает график динамики трат `AnalyticsBarChart` и пагинированный список операций.
 */
import { toRef, computed, ref, watch, onMounted, onUnmounted } from "vue";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarClock,
  RotateCcw,
} from "@lucide/vue";
import type { AnalyticsPeriodType } from "~/composables/useAnalyticsPeriod";
import { formatAmount } from "~/utils/format";
import {
  toSafeDate,
  formatMonthYear,
  formatPreviousMonth,
  formatMonthPrepositional,
} from "~/utils/date";
import { Z_INDEX } from "~/utils/zIndex";
import CategoryGoalCard from "~/components/goals/CategoryGoalCard.vue";

const props = defineProps<{
  isOpen: boolean;
  categoryId: string | null;
  period: AnalyticsPeriodType;
  selectedDate?: Date;
}>();

const emit = defineEmits(["close"]);

const localPeriod = toRef(props, "period");
const modalAnchorDate = computed(() => props.selectedDate ? new Date(props.selectedDate) : getNow());

const {
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  prevPeriodLabel,
  isCurrentMonthSelected,
} = useAnalyticsPeriod(localPeriod, modalAnchorDate);

const { deleteTransaction } = useTransactions();
const { openModal } = useTransactionModal();

const {
  pending,
  totalSpent,
  prevTotalSpent,
  currentExpenses,
  prevExpenses,
  percentChange,
  chartData,
  prevChartData,
  categoryStats,
} = useAnalyticsData(
  localPeriod,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  toRef(props, "categoryId"),
);

const isPrevPeriodChart = ref(false);
const isOperationsLoading = ref(false);

const INITIAL_PAGE_SIZE = 10;
const displayedLimit = ref(INITIAL_PAGE_SIZE);

watch(
  [() => props.isOpen, () => props.categoryId, () => props.selectedDate, localPeriod],
  () => {
    isPrevPeriodChart.value = false;
    displayedLimit.value = INITIAL_PAGE_SIZE;
    isOperationsLoading.value = false;
  },
);

watch(isPrevPeriodChart, () => {
  isOperationsLoading.value = true;
  displayedLimit.value = INITIAL_PAGE_SIZE;
  setTimeout(() => {
    isOperationsLoading.value = false;
  }, 220);
});

const prevPeriodName = computed(() => {
  if (localPeriod.value === "1M") {
    return formatMonthYear(prevStartDate.value);
  }
  if (localPeriod.value === "1W") {
    return "Прошлая неделя";
  }
  if (localPeriod.value === "3M") {
    return "Прошлые 3 месяца";
  }
  if (localPeriod.value === "6M") {
    return "Прошлые 6 месяцев";
  }
  if (localPeriod.value === "1Y") {
    return "Прошлый год";
  }
  return "Прошлый период";
});

const prevPeriodButtonName = computed(() => {
  switch (localPeriod.value) {
    case "1M":
      return `за ${formatPreviousMonth()}`;
    case "1W":
      return "за прошлую неделю";
    case "3M":
      return "за прошлые 3 месяца";
    case "6M":
      return "за прошлые 6 месяцев";
    case "1Y":
      return "за прошлый год";
    default:
      return "за прошлый период";
  }
});

const activeTransactions = computed(() => {
  const source = isPrevPeriodChart.value
    ? prevExpenses.value
    : currentExpenses.value;
  return [...source].sort(
    (a, b) => toSafeDate(b.date).getTime() - toSafeDate(a.date).getTime(),
  );
});

const displayedTransactions = computed(() =>
  activeTransactions.value.slice(0, displayedLimit.value),
);

const hasMoreTransactions = computed(
  () => displayedLimit.value < activeTransactions.value.length,
);

const remainingCount = computed(
  () => activeTransactions.value.length - displayedLimit.value,
);

const loadMore = () => {
  displayedLimit.value += INITIAL_PAGE_SIZE;
};

const loadMoreTriggerRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasMoreTransactions.value &&
          !isOperationsLoading.value
        ) {
          loadMore();
        }
      },
      { rootMargin: "120px" },
    );
  }
});

watch(loadMoreTriggerRef, (el) => {
  if (observer) {
    observer.disconnect();
    if (el) {
      observer.observe(el);
    }
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
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

const trendColor = computed(() => {
  if (percentChange.value === 0) return "text-text-secondary";
  return percentChange.value > 0 ? "text-text-accent" : "text-text-success";
});

const trendIcon = computed(() => {
  if (percentChange.value === 0) return Minus;
  return percentChange.value > 0 ? TrendingUp : TrendingDown;
});

// Получаем инфу о категории из stats (там будет ровно 1 элемент)
const currentCategory = computed(() => {
  if (categoryStats.value.length > 0) return categoryStats.value[0];
  return null;
});

const operationsTitle = computed(() => {
  if (isPrevPeriodChart.value) {
    switch (localPeriod.value) {
      case "1M":
        return `Операции ${prevPeriodButtonName.value}`;
      case "1W":
        return "Операции за прошлую неделю";
      case "3M":
        return "Операции за прошлые 3 месяца";
      case "6M":
        return "Операции за прошлые 6 месяцев";
      case "1Y":
        return "Операции за прошлый год";
      default:
        return "Операции за прошлый период";
    }
  }

  switch (localPeriod.value) {
    case "1W":
      return "Операции за неделю";
    case "3M":
      return "Операции за 3 месяца";
    case "6M":
      return "Операции за 6 месяцев";
    case "1Y":
      return "Операции за год";
    default:
      return "Операции за месяц";
  }
});

const emptyTransactionsText = computed(() => {
  if (isPrevPeriodChart.value) {
    switch (localPeriod.value) {
      case "1M":
        return `В ${formatMonthPrepositional(prevStartDate.value)} операций по категории не было`;
      case "1W":
        return "На прошлой неделе операций по категории не было";
      case "3M":
        return "За прошлые 3 месяца операций по категории не было";
      case "6M":
        return "За прошлые полгода операций по категории не было";
      case "1Y":
        return "В прошлом году операций по категории не было";
      default:
        return "В прошлом периоде операций по категории не было";
    }
  }

  switch (localPeriod.value) {
    case "1W":
      return "На этой неделе операций по категории ещё не было";
    case "3M":
      return "За 3 месяца операций по категории ещё не было";
    case "6M":
      return "За полгода операций по категории ещё не было";
    case "1Y":
      return "За год операций по категории ещё не было";
    default:
      if (!isCurrentMonthSelected.value) {
        return `В ${formatMonthPrepositional(startDate.value)} операций по категории не было`;
      }
      return "В этом месяце операций по категории ещё не было";
  }
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
          class="w-11 h-11 shrink-0 flex items-center justify-center rounded-full glass-pill text-base"
        >
          {{ currentCategory?.categoryIcon || "📂" }}
        </div>
        <div class="flex flex-col min-w-0">
          <h2
            class="text-text-primary text-base font-bold tracking-wide truncate"
          >
            {{ currentCategory?.categoryName || "Категория" }}
          </h2>
          <p
            class="text-text-secondary text-xs uppercase tracking-wider font-semibold mt-0.5"
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
        <GlassCard class="p-4 flex justify-between items-start">
          <div class="flex flex-col gap-1">
            <p
              class="text-text-secondary text-[10px] uppercase font-bold tracking-wide"
            >
              Траты за период
            </p>
            <span
              class="text-text-primary text-2xl font-extrabold tracking-tight"
              >{{ formatAmount(totalSpent) }}</span
            >
          </div>

          <div class="flex flex-col items-end gap-1.5">
            <p
              class="text-text-secondary text-[10px] uppercase font-bold tracking-wide"
            >
              {{ prevPeriodLabel }}
            </p>
            <div v-if="prevTotalSpent > 0" class="flex items-center gap-1.5">
              <div class="mt-0.5 p-1 rounded-full glass-pill">
                <component
                  :is="trendIcon"
                  class="w-4 h-4 stroke-2"
                  :class="trendColor"
                />
              </div>
              <span class="text-sm mt-1" :class="trendColor">
                {{ percentChange > 0 ? "+" : "" }}{{ percentChange }}%
              </span>
            </div>
            <span v-else class="text-xs text-text-secondary mt-2 font-medium">
              Нет данных
            </span>
          </div>
        </GlassCard>

        <!-- Цель на месяц (только во вкладке Месяц для текущего месяца) -->
        <CategoryGoalCard
          v-if="localPeriod === '1M' && isCurrentMonthSelected"
          :category-id="categoryId"
          :month-spent="totalSpent"
        />

        <!-- График -->
        <GlassCard class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h2
              class="text-text-secondary font-bold text-sm uppercase tracking-wider"
            >
              Динамика расходов по категории
            </h2>
            <span
              v-if="isPrevPeriodChart"
              class="text-[10px] text-center font-medium px-2.5 py-0.5 rounded-full bg-accent-start/10 text-text-accent tracking-wide transition-all w-fit"
            >
              {{ prevPeriodName }}
            </span>
          </div>

          <AnalyticsBarChart
            :key="isPrevPeriodChart ? 'prev' : 'current'"
            :data="isPrevPeriodChart ? prevChartData : chartData"
          />

          <button
            v-if="isCurrentMonthSelected"
            type="button"
            class="self-center flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-full glass-pill text-text-accent hover:text-text-primary text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer a11y-focus"
            @click="isPrevPeriodChart = !isPrevPeriodChart"
          >
            <component
              :is="isPrevPeriodChart ? RotateCcw : CalendarClock"
              class="w-3.5 h-3.5"
            />
            <span>
              {{
                isPrevPeriodChart
                  ? "Вернуться обратно"
                  : `Посмотреть ${prevPeriodButtonName}`
              }}
            </span>
          </button>
        </GlassCard>

        <!-- Операции за текущий или прошлый период -->
        <GlassCard class="p-4 flex flex-col gap-px pb-1">
          <div class="flex justify-between items-center px-1">
            <h3
              class="text-text-secondary font-bold text-xs uppercase tracking-wider"
            >
              {{ operationsTitle }}
            </h3>
            <span class="text-text-secondary text-xs font-semibold">
              {{ activeTransactions.length }}
            </span>
          </div>

          <!-- Скелетоны транзакций (загрузка данных или ленивая подгрузка при переключении) -->
          <div v-if="pending || isOperationsLoading" class="flex flex-col">
            <TransactionSkeletonList
              :count="3"
              mode="list"
              :show-icon="false"
            />
          </div>

          <!-- Список транзакций -->
          <div
            v-else-if="displayedTransactions.length > 0"
            class="flex flex-col"
          >
            <TransactionItem
              v-for="tx in displayedTransactions"
              :key="tx.id"
              v-memo="[
                tx.id,
                tx.amount,
                tx.name,
                tx.date,
                tx.type,
                deletingId === tx.id,
              ]"
              variant="analytics"
              :title="tx.name || tx.categoryName"
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

            <!-- Ленивая подгрузка (триггер скролла / кнопка) -->
            <div
              v-if="hasMoreTransactions"
              ref="loadMoreTriggerRef"
              class="flex flex-col items-center justify-center pt-2.5 pb-1"
            >
              <button
                type="button"
                class="text-xs font-semibold text-text-accent hover:text-text-primary active:scale-95 transition-all py-1.5 px-4 rounded-full glass-pill cursor-pointer flex items-center gap-1.5 a11y-focus"
                @click="loadMore"
              >
                <span>Показать ещё (ещё {{ remainingCount }})</span>
              </button>
            </div>
          </div>

          <!-- Пустое состояние при отсутствии трат -->
          <p v-else class="text-text-secondary text-xs text-center py-2 px-5">
            {{ emptyTransactionsText }}
          </p>
        </GlassCard>
      </div>
    </div>
  </GlassModal>
</template>
