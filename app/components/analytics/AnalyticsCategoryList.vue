<script setup lang="ts">
/**
 * @module app/components/analytics/AnalyticsCategoryList
 * @fileoverview Список категорий с горизонтальными прогресс-барами
 * @description
 * Отображает каждую категорию трат, отсортированную по убыванию.
 * Ширина прогресс-бара считается относительно максимальной траты в категории.
 * При клике на категорию можно вызвать модалку детализации (через emit).
 * ---
 * ### Логика работы:
 * 1. Получает массив `categoryStats`.
 * 2. Находит максимальную сумму для расчета 100% ширины бара.
 * 3. Отрисовывает список элементов.
 */
import { computed } from "vue";
import type { CategoryStat } from "~/utils/analytics";
import { formatAmount } from "~/utils/format";
import { ChevronRight } from "@lucide/vue";

const props = defineProps<{
  stats: CategoryStat[];
}>();

const emit = defineEmits<{
  (e: "click-category", id: string): void;
}>();

const maxAmount = computed(() => {
  if (!props.stats.length) return 0;
  return Math.max(...props.stats.map((s) => s.amount));
});

const getBarWidth = (amount: number) => {
  if (maxAmount.value === 0) return 0;
  return Math.round((amount / maxAmount.value) * 100);
};
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <div
      v-for="stat in stats"
      :key="stat.categoryId"
      role="button"
      tabindex="0"
      :aria-label="`${stat.categoryName}: ${formatAmount(stat.amount)}, ${stat.percent}% от трат`"
      class="flex flex-col gap-2 p-3 rounded-2xl glass-milky border-[0.5px] border-white/40 active:scale-[0.98] transition-transform cursor-pointer outline-none a11y-focus"
      @click="emit('click-category', stat.categoryId)"
      @keydown.enter.prevent="emit('click-category', stat.categoryId)"
      @keydown.space.prevent="emit('click-category', stat.categoryId)"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 flex items-center justify-center bg-white/50 rounded-full shadow-sm text-lg"
          >
            {{ stat.categoryIcon || "📂" }}
          </div>
          <span class="text-text-primary font-bold text-sm tracking-tight">{{
            stat.categoryName
          }}</span>
        </div>

        <div class="flex items-center gap-2 text-right">
          <div class="flex flex-col">
            <span class="text-text-primary font-extrabold text-sm">{{
              formatAmount(stat.amount)
            }}</span>
            <span
              class="text-text-secondary text-[10px] uppercase font-semibold"
              >{{ stat.percent }}% от трат</span
            >
          </div>
          <ChevronRight class="w-4 h-4 text-text-secondary opacity-50" />
        </div>
      </div>

      <!-- Прогресс бар -->
      <div
        class="w-full h-1.5 glass-pill rounded-full overflow-hidden"
        role="progressbar"
        :aria-valuenow="getBarWidth(stat.amount)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Доля трат: ${stat.percent}%`"
      >
        <div
          class="h-full bg-text-accent rounded-full transition-all duration-700 ease-out"
          :style="{ width: `${getBarWidth(stat.amount)}%` }"
        />
      </div>
    </div>

    <div
      v-if="stats.length === 0"
      class="text-center text-text-secondary text-sm py-4"
    >
      Нет трат за этот период
    </div>
  </div>
</template>
