<script setup lang="ts">
/**
 * @module app/components/analytics/CategoryAnalyticsModal
 * @fileoverview Детальная аналитика по одной категории
 * @description
 * Модальное окно, показывающее динамику трат (график) и инсайты
 * конкретно для выбранной категории за выбранный период.
 * ---
 * ### Логика работы:
 * 1. Получает `categoryId` и `period` из пропсов.
 * 2. Вызывает `useAnalyticsData` с фильтром по `categoryId`.
 * 3. Отрисовывает `AnalyticsBarChart` и метрики (рост/падение).
 */
import { toRef, computed } from "vue";
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
  <GlassModal :is-open="isOpen" position="bottom" @close="close">
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
      </div>
    </div>
  </GlassModal>
</template>
