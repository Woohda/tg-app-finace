<script setup lang="ts">
/**
 * @module app/pages/analytics
 * @fileoverview Экран подробной аналитики и отчетов по финансам
 * @description
 * Отображает графики динамики, прогноз расходов, сводку доходов и расходов,
 * распределение трат по категориям, а также детальное сопоставление с прошлыми периодами.
 * Поддерживает селектор архивных месяцев для ретроспективного анализа.
 * ---
 * ### Логика работы:
 * 1. Выбор периода анализа: Неделя, Месяц, 3 Месяца.
 * 2. При выборе вкладки «Месяц» отображает селектор месяцев `MonthSelector` с блокировкой перехода в будущее.
 * 3. Для текущего месяца отображает сферу прогноза `LiquidSphere` и индикатор темпа расходов.
 * 4. Для архивных месяцев отображает карточку `PastMonthComparisonCard` со среднедневным чеком и топ-3 категориями с сопоставлением к прогнозу (с умной нормализацией по дням для регулярных категорий).
 * 5. Расчет агрегированных данных, прогноза и распределения трат через `useAnalyticsData`.
 * 6. Детальный просмотр и управление лимитами через модальное окно `CategoryAnalyticsModal`.
 */
import { ref, computed, watch, onMounted } from "vue";
import { TrendingUp, TrendingDown } from "@lucide/vue";
import { formatAmount } from "~/utils/format";
import {
  calculatePercentChange,
  calculateCategoryForecast,
  normalizeMonthlyAmount,
} from "~/utils/analytics";
import {
  getNow,
  getNextMonth,
  getPrevMonth,
  isCurrentMonth,
  getDaysPassedInMonth,
  getDaysInMonthCount,
} from "~/utils/date";

const selectedMonthDate = ref(getNow());

const nextMonth = () => {
  if (isCurrentMonth(selectedMonthDate.value)) return;
  selectedMonthDate.value = getNextMonth(selectedMonthDate.value);
};

const prevMonth = () => {
  selectedMonthDate.value = getPrevMonth(selectedMonthDate.value);
};

const {
  period,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  prevPeriodLabel,
  monthsLabel,
  isCurrentMonthSelected,
} = useAnalyticsPeriod(undefined, selectedMonthDate);

watch(period, (newPeriod) => {
  if (newPeriod !== "1M") {
    selectedMonthDate.value = getNow();
  }
});

const { fetchGoals } = useCategoryGoals();

onMounted(() => {
  fetchGoals();
});

const { subscriptions } = useSubscriptions();

const {
  pending,
  totalSpent,
  prevTotalSpent,
  totalIncome,
  prevTotalIncome,
  incomePercentChange,
  percentChange,
  forecast,
  avgDaily,
  prevAvgDaily,
  upcomingSubscriptionsTotal,
  categoryStats,
  chartData,
  currentExpenses,
  prevExpenses,
} = useAnalyticsData(period, startDate, endDate, prevStartDate, prevEndDate);

// Сравнение трех наибольших трат в категориях выбранного месяца с текущим (по прогнозу)
const topCategoriesComparison = computed(() => {
  const top3 = categoryStats.value.slice(0, 3);
  if (top3.length === 0) return [];

  const daysPassed = getDaysPassedInMonth();
  const daysInMonth = getDaysInMonthCount();

  return top3.map((cat) => {
    const selectedCatExpenses = currentExpenses.value.filter(
      (t) => t.categoryId === cat.categoryId,
    );
    const currentCatExpenses = prevExpenses.value.filter(
      (t) => t.categoryId === cat.categoryId,
    );
    const currentTotal = currentCatExpenses.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    const currentForecast = calculateCategoryForecast({
      currentExpenses: currentCatExpenses,
      prevExpenses: selectedCatExpenses,
      subscriptions: subscriptions.value,
      categoryId: cat.categoryId,
      daysPassed,
      daysInMonth,
    });

    const targetAmount =
      currentForecast !== null && currentForecast > 0
        ? currentForecast
        : currentTotal;

    const isFrequent =
      selectedCatExpenses.length > 3 || currentCatExpenses.length > 3;

    const selectedDays = getDaysInMonthCount(selectedMonthDate.value);
    const comparisonSelectedAmount = isFrequent
      ? normalizeMonthlyAmount(cat.amount, selectedDays, daysInMonth)
      : cat.amount;

    let change: number | null = null;
    if (targetAmount > 0) {
      change = calculatePercentChange(comparisonSelectedAmount, targetAmount);
    }

    return {
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryIcon: cat.categoryIcon,
      selectedAmount: cat.amount,
      currentAmount: targetAmount,
      isForecast: Boolean(currentForecast !== null && currentForecast > 0),
      percentChange: change,
    };
  });
});

// --- Индикатор темпа (Pacing Indicator) ---
// В качестве ориентира (бюджета) теперь берем прогноз (как в изначальном range)
const baseline = computed(() => forecast.value || 1);

const rawSpendPercent = computed(() =>
  Math.round((totalSpent.value / baseline.value) * 100),
);

const spendPercent = computed(() => Math.min(rawSpendPercent.value, 100));

// Для статуса "Траты выше нормы" сравниваем текущий среднедневной расход со среднедневным расходом прошлого месяца
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
    <div class="flex flex-col text-center">
      <h1 class="text-text-primary text-xl font-bold tracking-wide">
        Аналитика
      </h1>
      <p class="text-text-secondary text-xs">Сводка расходов по периодам</p>
    </div>

    <!-- Селектор периодов -->
    <GlassSegmentedControl
      v-model="period"
      :options="periodOptions"
      size="md"
      class="w-full"
    />

    <!-- Селектор месяца (только во вкладке Месяц) -->
    <MonthSelector
      v-if="period === '1M'"
      :date="selectedMonthDate"
      :disable-next="isCurrentMonthSelected"
      @prev="prevMonth"
      @next="nextMonth"
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
          :percent-change="prevTotalSpent > 0 ? percentChange : null"
          :prev-period-label="prevPeriodLabel"
          trend-type="expense"
        />

        <AnalyticsSummaryCard
          title="Доходы"
          :amount="totalIncome"
          :percent-change="prevTotalIncome > 0 ? incomePercentChange : null"
          :prev-period-label="prevPeriodLabel"
          trend-type="income"
        />
      </div>
      <!-- Прогноз (только для текущего месяца во вкладке Месяц) -->
      <GlassCard
        v-if="
          isCurrentMonthSelected &&
          forecast !== null &&
          (avgDaily > 0 || forecast > 0)
        "
        class="flex-1 p-5 flex items-center gap-5"
      >
        <!-- Объемный сферический стеклянный шар (Liquid Sphere Component) -->
        <LiquidSphere
          :value="spendPercent"
          label="Прогноз"
          :amount="formatAmount(forecast)"
        />

        <!-- Текст справа -->
        <div class="flex flex-col gap-2 flex-1">
          <div class="flex flex-col gap-px">
            <span
              class="text-text-secondary text-[11px] font-bold uppercase tracking-wider"
            >
              Средний чек трат
            </span>
            <span
              class="text-text-primary text-base font-extrabold tracking-tight"
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

          <div
            v-if="prevTotalSpent > 0"
            class="flex items-center gap-1.5 mt-px"
          >
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
              class="text-[10px] font-bold leading-tight whitespace-pre-line"
              :class="isOverspending ? 'text-text-accent' : 'text-text-success'"
            >
              {{
                isOverspending
                  ? `Тратите больше,\nчем в прошлом месяце`
                  : `Отличный темп,\nвы экономите`
              }}
            </p>
          </div>
        </div>
      </GlassCard>

      <!-- Вместо сферы: Карточка среднего чека и топ-3 категорий для прошлого месяца -->
      <PastMonthComparisonCard
        v-else-if="period === '1M' && !isCurrentMonthSelected"
        :avg-daily="avgDaily"
        :current-month-avg-daily="prevAvgDaily"
        :percent-change="percentChange"
        :current-month-label="monthsLabel"
        :top-categories="topCategoriesComparison"
        @click-category="openCategoryAnalytics"
      />

      <!-- График -->
      <GlassCard class="p-5 flex flex-col gap-1">
        <div class="flex justify-between items-center">
          <h2
            class="text-text-primary font-bold text-sm uppercase tracking-wider"
          >
            Динамика расходов
          </h2>
        </div>
        <AnalyticsBarChart :data="chartData" />
      </GlassCard>

      <!-- Топ категорий -->
      <div class="flex flex-col gap-3">
        <h2
          class="text-text-primary font-bold text-sm uppercase tracking-wider px-1"
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
      :selected-date="selectedMonthDate"
      @close="closeCategoryAnalytics"
    />
  </div>
</template>
