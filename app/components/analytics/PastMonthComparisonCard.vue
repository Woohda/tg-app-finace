<script setup lang="ts">
/**
 * @module app/components/analytics/PastMonthComparisonCard
 * @fileoverview Карточка аналитики и сопоставления расходов для прошлых месяцев
 * @description
 * Отображает сравнение среднедневного темпа трат выбранного архивного месяца с текущим месяцем,
 * интегрирует фоновое пятно AuroraBudget в режиме delta, а также детально сопоставляет
 * 3 категории с наибольшими расходами.
 * ---
 * ### Логика работы:
 * 1. Верхний блок: рассчитывает и отображает средний чек трат на день выбранного месяца и сопоставляет его со среднедневным темпом текущего месяца.
 * 2. Фоновая плашка: отрисовывает анимацию AuroraBudget с процентом изменения динамики трат к текущему месяцу.
 * 3. Нижний блок: выводит список 3-х крупнейших категорий месяца с сопоставлением к прогнозу текущего месяца (`isForecast`), умной нормализацией по дням для регулярных категорий и процентным изменением.
 */
import { formatAmount } from "~/utils/format";

export interface TopCategoryComparisonItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  selectedAmount: number;
  currentAmount: number;
  isForecast?: boolean;
  percentChange: number | null;
}

defineProps<{
  avgDaily: number;
  currentMonthAvgDaily: number;
  percentChange: number;
  currentMonthLabel: string;
  topCategories: TopCategoryComparisonItem[];
}>();

const emit = defineEmits<{
  (e: "clickCategory", categoryId: string): void;
}>();
</script>

<template>
  <GlassCard class="flex flex-col gap-4 relative overflow-hidden">
    <!-- Фоновое "дышащее" пятно Aurora и процент (мятный / красный винный) -->
    <AuroraBudget :percent="percentChange" mode="delta" class="z-0" />

    <!-- Верхний блок: Средний чек трат на день -->
    <div class="flex items-start justify-between gap-3 relative z-10">
      <div class="flex flex-col gap-1 min-w-0">
        <span
          class="text-text-secondary text-[11px] font-bold uppercase tracking-wider truncate"
        >
          Средний чек трат на день
        </span>
        <div class="flex items-baseline gap-1.5">
          <span
            class="text-text-primary text-2xl font-extrabold tracking-tight"
          >
            {{ formatAmount(avgDaily) }}
          </span>
          <span class="text-xs font-bold text-text-secondary">/день</span>
        </div>
        <span
          v-if="currentMonthAvgDaily > 0"
          class="text-text-secondary text-xs leading-tight"
        >
          В {{ currentMonthLabel }}:
          {{ formatAmount(currentMonthAvgDaily) }}/день
        </span>
      </div>
    </div>
  </GlassCard>
  <GlassCard>
    <!-- Нижний блок: Сравнение трех наибольших трат в категориях -->
    <div
      v-if="topCategories.length > 0"
      class="flex flex-col gap-2.5 relative z-10"
    >
      <div class="flex items-center justify-between">
        <span
          class="text-text-secondary text-[11px] font-bold uppercase tracking-wider"
        >
          Топ-3 категории vs Текущий месяц
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="cat in topCategories"
          :key="cat.categoryId"
          class="flex items-center justify-between p-2 rounded-2xl glass-pill transition-colors cursor-pointer active:scale-[0.99] gap-2"
          @click="emit('clickCategory', cat.categoryId)"
        >
          <!-- Иконка и название -->
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span class="text-lg leading-none shrink-0">{{
              cat.categoryIcon
            }}</span>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-text-primary truncate">
                {{ cat.categoryName }}
              </span>
              <span class="text-[11px] text-text-secondary truncate">
                {{
                  cat.isForecast
                    ? `Прогноз в ${currentMonthLabel}:`
                    : `В ${currentMonthLabel}:`
                }}
                {{ formatAmount(cat.currentAmount) }}
              </span>
            </div>
          </div>

          <!-- Сумма в выбранном месяце и разница -->
          <div class="flex flex-col items-end shrink-0">
            <span class="text-xs font-bold text-text-primary">
              {{ formatAmount(cat.selectedAmount) }}
            </span>
            <span
              v-if="cat.percentChange !== null"
              class="text-[10px] font-semibold"
              :class="
                cat.percentChange === 0
                  ? 'text-text-secondary'
                  : cat.percentChange > 0
                    ? 'text-text-accent'
                    : 'text-text-success'
              "
            >
              {{ cat.percentChange > 0 ? "+" : "" }}{{ cat.percentChange }}%
            </span>
            <span v-else class="text-[10px] text-text-secondary"> - </span>
          </div>
        </div>
      </div>
    </div>
  </GlassCard>
</template>
