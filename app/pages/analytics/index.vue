<script setup lang="ts">
/**
 * @module app/pages/analytics
 * @fileoverview Экран подробной аналитики и отчетов
 * @description
 * Отображает графики и детальную сводку по категориям расходов.
 * ---
 * ### Логика работы:
 * 1. Выбор периода (Неделя, Месяц, 3 Месяца).
 * 2. Расчет данных для графиков и списка категорий (`useAnalyticsData`).
 * 3. Генерация текстовых инсайтов (`useAnalyticsInsights`).
 */
import { ref } from "vue";
import { TrendingUp, TrendingDown } from "@lucide/vue";
import { formatAmount } from "~/utils/format";

const {
  period,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  prevPeriodLabel,
  monthsLabel,
} = useAnalyticsPeriod();

const {
  pending,
  totalSpent,
  prevTotalSpent,
  totalIncome,
  incomePercentChange,
  percentChange,
  forecast,
  avgDaily,
  upcomingSubscriptionsTotal,
  categoryStats,
  chartData,
} = useAnalyticsData(period, startDate, endDate, prevStartDate, prevEndDate);

// --- Индикатор темпа (Pacing Indicator) ---
const daysInMonth = computed(() => getDaysInMonthCount());

// В качестве ориентира (бюджета) теперь берем прогноз (как в изначальном range)
const baseline = computed(() => forecast.value || 1);

const rawSpendPercent = computed(() =>
  Math.round((totalSpent.value / baseline.value) * 100),
);

const spendPercent = computed(() => Math.min(rawSpendPercent.value, 100));

const prevAvgDaily = computed(() => {
  if (prevTotalSpent.value === 0) return 0;
  return prevTotalSpent.value / daysInMonth.value;
});

// Для статуса "Траты выше нормы" все равно полезно сравнивать текущие траты с прошлым месяцем
const isOverspending = computed(() => {
  if (prevAvgDaily.value === 0) return false;
  return avgDaily.value > prevAvgDaily.value;
});

const periodOptions = [
  { id: "1W", label: "Неделя" },
  { id: "1M", label: "Месяц" },
  { id: "3M", label: "3 Мес" },
];

const selectedCategoryId = ref<string | null>(null);

const openCategoryAnalytics = (id: string) => {
  selectedCategoryId.value = id;
};

const closeCategoryAnalytics = () => {
  selectedCategoryId.value = null;
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Шапка -->
    <div class="flex flex-col text-center mt-2">
      <h1 class="text-text-primary text-2xl font-black tracking-tight">
        Аналитика
      </h1>
      <p class="text-text-secondary text-xs mt-1">
        Сводка расходов по периодам
      </p>
    </div>

    <!-- Селектор периодов -->
    <GlassSegmentedControl
      v-model="period"
      :options="periodOptions"
      size="md"
      class="w-full"
    />

    <!-- Лоадер -->
    <div v-if="pending" class="flex flex-col gap-4">
      <div class="flex gap-5">
        <Skeleton class="w-full h-25" rounded="rounded-3xl" />
        <Skeleton class="w-full h-25" rounded="rounded-3xl" />
      </div>
      <Skeleton class="w-full h-16" rounded="rounded-3xl" />
      <Skeleton class="w-full h-16" rounded="rounded-3xl" />
      <Skeleton class="w-full h-50" rounded="rounded-3xl" />
    </div>

    <div v-else class="flex flex-col gap-5">
      <!-- Сводка (Доходы и расходы) -->
      <div class="flex gap-4 w-full">
        <AnalyticsSummaryCard
          title="Расходы"
          :amount="totalSpent"
          :percent-change="percentChange"
          :prev-period-label="prevPeriodLabel"
          trend-type="expense"
        />

        <AnalyticsSummaryCard
          title="Доходы"
          :amount="totalIncome"
          :percent-change="incomePercentChange"
          :prev-period-label="prevPeriodLabel"
          trend-type="income"
        />
      </div>
      <!-- Прогноз (только для месяца) -->
      <GlassCard
        v-if="forecast !== null && (avgDaily > 0 || forecast > 0)"
        class="flex-1 p-5 flex items-center gap-5"
      >
        <!-- Объемный сферический стеклянный шар (Liquid Sphere Component) -->
        <LiquidSphere
          :value="spendPercent"
          label="Прогноз"
          :amount="formatAmount(forecast)"
          :color="isOverspending ? 'accent' : 'green'"
        />

        <!-- Текст справа -->
        <div class="flex flex-col gap-2 flex-1">
          <div class="flex flex-col gap-px">
            <span
              class="text-text-secondary text-[11px] font-bold uppercase tracking-wide"
            >
              Средний чек
            </span>
            <span
              class="text-text-primary text-base font-extrabold tracking-tighter"
            >
              {{ formatAmount(avgDaily)
              }}<span class="text-xs font-bold text-text-secondary">/день</span>
            </span>
            <span
              v-if="prevAvgDaily > 0"
              class="mt-px text-text-secondary text-[11px] leading-tight"
            >
              В {{ monthsLabel }}: {{ formatAmount(prevAvgDaily) }}/день
            </span>
            <span
              v-if="upcomingSubscriptionsTotal > 0"
              class="mt-1 text-text-secondary text-[11px] leading-tight"
            >
              План. платежи: {{ formatAmount(upcomingSubscriptionsTotal) }}
            </span>
          </div>

          <div v-if="prevTotalSpent > 0" class="flex items-start gap-1.5 mt-px">
            <div class="mt-px p-1 rounded-full glass-pill">
              <component
                :is="isOverspending ? TrendingUp : TrendingDown"
                class="w-3 h-3"
                :class="
                  isOverspending ? 'text-text-accent' : 'text-text-success'
                "
              />
            </div>
            <p
              class="text-[10px] font-bold leading-tight"
              :class="isOverspending ? 'text-text-accent' : 'text-text-success'"
            >
              {{
                isOverspending
                  ? "Тратите быстрее, чем в прошлом месяце"
                  : "Отличный темп, вы экономите"
              }}
            </p>
          </div>
        </div>
      </GlassCard>

      <!-- График -->
      <GlassCard class="p-5 flex flex-col gap-1">
        <div class="flex justify-between items-center">
          <h2
            class="text-text-primary font-bold text-sm uppercase tracking-wide"
          >
            Динамика расходов
          </h2>
        </div>
        <AnalyticsBarChart :data="chartData" />
      </GlassCard>

      <!-- Топ категорий -->
      <div class="flex flex-col gap-3 mt-2">
        <h2
          class="text-text-primary font-bold text-sm uppercase tracking-wide px-1"
        >
          По категориям
        </h2>
        <AnalyticsCategoryList
          :stats="categoryStats"
          @click-category="openCategoryAnalytics"
        />
      </div>
    </div>

    <!-- Модалка детальной аналитики категории -->
    <CategoryAnalyticsModal
      :is-open="selectedCategoryId !== null"
      :category-id="selectedCategoryId"
      :period="period"
      @close="closeCategoryAnalytics"
    />
  </div>
</template>
