<script setup lang="ts">
/**
 * @module app/components/analytics/CategoryAnalyticsModal
 * @fileoverview Детальная аналитика по отдельной категории
 * @description
 * Модальное окно верхнего уровня, объединяющее аналитические блоки категории:
 * - сводка трат за период и динамика к прошлому периоду;
 * - цель трат на месяц (CategoryGoalCard);
 * - качественные микро-метрики покупок (CategoryMetricsCard);
 * - график динамики расходов со сменой периода (CategoryDynamicsCard);
 * - пагинированный список операций с бесконечным скроллом (CategoryOperationsList).
 * ---
 * ### Логика работы:
 * 1. Получает `categoryId`, `period` и опциональную дату `selectedDate` из пропсов.
 * 2. Синхронизирует интервалы дат и статус выбранного месяца через `useAnalyticsPeriod`.
 * 3. Запрашивает агрегированные данные категории через `useAnalyticsData`, рассчитывая прогноз расходов и нормализацию по дням.
 * 4. Делегирует отображение графиков, микро-метрик и списка операций специализированным подкомпонентам.
 */
import { toRef, computed, ref, watch } from "vue";
import { TrendingUp, TrendingDown, Minus, Coins } from "@lucide/vue";
import type { AnalyticsPeriodType } from "~/composables/useAnalyticsPeriod";
import { formatAmount } from "~/utils/format";
import {
  toSafeDate,
  formatMonthYear,
  formatPreviousMonth,
  formatMonthPrepositional,
  getNow,
} from "~/utils/date";
import { differenceInCalendarDays } from "date-fns";
import {
  calculateCategoryDetailedMetrics,
  calculateMedian,
} from "~/utils/analytics";
import { Z_INDEX } from "~/utils/zIndex";
import GlassModal from "~/components/shared/GlassModal.vue";
import GlassCard from "~/components/shared/GlassCard.vue";
import Skeleton from "~/components/ui/Skeleton.vue";
import CategoryGoalCard from "~/components/goals/CategoryGoalCard.vue";
import CategoryMetricsCard from "./CategoryMetricsCard.vue";
import CategoryDynamicsCard from "./CategoryDynamicsCard.vue";
import CategoryOperationsList from "./CategoryOperationsList.vue";

interface Props {
  isOpen: boolean;
  categoryId: string | null;
  period: AnalyticsPeriodType;
  selectedDate?: Date;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
}>();

const localPeriod = toRef(props, "period");
const modalAnchorDate = computed(() =>
  props.selectedDate ? new Date(props.selectedDate) : getNow(),
);

const {
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  prevPeriodLabel,
  isCurrentMonthSelected,
} = useAnalyticsPeriod(localPeriod, modalAnchorDate);

const {
  pending,
  totalSpent,
  prevTotalSpent,
  currentExpenses,
  prevExpenses,
  percentChange,
  forecast,
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

watch(
  [
    () => props.isOpen,
    () => props.categoryId,
    () => props.selectedDate,
    localPeriod,
  ],
  () => {
    isPrevPeriodChart.value = false;
  },
);

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

const activePeriodDays = computed(() => {
  const start = isPrevPeriodChart.value ? prevStartDate.value : startDate.value;
  const end = isPrevPeriodChart.value ? prevEndDate.value : endDate.value;
  return Math.max(1, differenceInCalendarDays(end, start) + 1);
});

const comparisonPeriodDays = computed(() => {
  const start = isPrevPeriodChart.value ? startDate.value : prevStartDate.value;
  const end = isPrevPeriodChart.value ? endDate.value : prevEndDate.value;
  return Math.max(1, differenceInCalendarDays(end, start) + 1);
});

const categoryDetailedMetrics = computed(() => {
  const source = isPrevPeriodChart.value
    ? prevExpenses.value
    : currentExpenses.value;
  const comparisonSource = isPrevPeriodChart.value
    ? currentExpenses.value
    : prevExpenses.value;

  return calculateCategoryDetailedMetrics(
    source,
    activePeriodDays.value,
    comparisonSource,
    comparisonPeriodDays.value,
  );
});

const effectiveMedianCheck = computed(() => {
  if (categoryDetailedMetrics.value.medianCheck > 0) {
    return categoryDetailedMetrics.value.medianCheck;
  }
  if (prevExpenses.value.length > 0) {
    return calculateMedian(prevExpenses.value.map((t) => t.amount));
  }
  return null;
});

const metricsPeriodLabel = computed(() => {
  if (isPrevPeriodChart.value) {
    return prevPeriodName.value;
  }
  if (localPeriod.value === "1M") {
    return formatMonthYear(startDate.value);
  }
  return "за период";
});

const trendColor = computed(() => {
  if (percentChange.value === 0) return "text-text-secondary";
  return percentChange.value > 0 ? "text-text-accent" : "text-text-success";
});

const trendIcon = computed(() => {
  if (percentChange.value === 0) return Minus;
  return percentChange.value > 0 ? TrendingUp : TrendingDown;
});

const comparisonPeriodLabel = computed(() => {
  if (localPeriod.value === "1M" && !isCurrentMonthSelected.value) {
    return `К прогнозу в ${formatMonthPrepositional(getNow())}`;
  }
  return prevPeriodLabel.value;
});

const hasComparisonData = computed(() => {
  if (localPeriod.value === "1M") {
    if (!isCurrentMonthSelected.value) {
      return (
        (forecast.value !== null && forecast.value > 0) ||
        prevTotalSpent.value > 0
      );
    }
    return prevTotalSpent.value > 0;
  }
  return prevTotalSpent.value > 0;
});

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
        <GlassCard class="flex justify-between items-start">
          <div class="flex flex-col gap-1 shrink-0">
            <div class="flex items-center gap-1.5">
              <Coins class="w-4 h-4 text-text-accent" stroke-width="2" />
              <span
                class="text-[10px] uppercase font-bold tracking-wide text-text-secondary"
              >
                Расходы за период
              </span>
            </div>

            <span
              class="text-text-primary text-2xl font-extrabold tracking-tight"
            >
              {{ formatAmount(totalSpent) }}
            </span>
            <span
              v-if="
                localPeriod === '1M' &&
                isCurrentMonthSelected &&
                forecast !== null &&
                forecast > 0
              "
              class="text-[11px] text-text-secondary font-medium mt-0.5"
            >
              Прогноз: {{ formatAmount(forecast) }}
            </span>
          </div>

          <div class="mt-px flex flex-col items-end gap-1 text-right">
            <p
              class="text-text-secondary text-[10px] uppercase font-bold tracking-wide"
            >
              {{ comparisonPeriodLabel }}
            </p>
            <div v-if="hasComparisonData" class="flex items-center gap-1.5">
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
          :forecast="forecast"
          :median-check="effectiveMedianCheck"
        />

        <!-- Микро-метрики покупок по категории -->
        <CategoryMetricsCard
          :metrics="categoryDetailedMetrics"
          :period-label="metricsPeriodLabel"
          :comparison-label="comparisonPeriodLabel"
        />

        <!-- График динамики -->
        <CategoryDynamicsCard
          :chart-data="chartData"
          :prev-chart-data="prevChartData"
          :is-prev-period="isPrevPeriodChart"
          :prev-period-name="prevPeriodName"
          :prev-period-button-name="prevPeriodButtonName"
          :can-toggle-period="isCurrentMonthSelected"
          @toggle-period="isPrevPeriodChart = !isPrevPeriodChart"
        />

        <!-- Операции за текущий или прошлый период -->
        <CategoryOperationsList
          :transactions="activeTransactions"
          :title="operationsTitle"
          :empty-text="emptyTransactionsText"
          :pending="pending"
        />
      </div>
    </div>
  </GlassModal>
</template>
