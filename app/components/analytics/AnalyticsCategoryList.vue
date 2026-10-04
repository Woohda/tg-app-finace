<script setup lang="ts">
/**
 * @module app/components/analytics/AnalyticsCategoryList
 * @fileoverview Список категорий расходов с индикаторами целей
 * @description
 * Отображает список категорий расходов, отсортированных по убыванию трат,
 * делегируя отображение прогресс-бара и целей компоненту AnalyticsCategoryItem.
 * ---
 * ### Логика работы:
 * 1. Получает массив статистики по категориям через пропс `stats`.
 * 2. Извлекает максимальную сумму за O(1) из первого элемента отсортированного массива `stats[0]`.
 * 3. Централизованно запрашивает цели категорий через `useCategoryGoals` и передает их в `AnalyticsCategoryItem`.
 */
import { computed } from "vue";
import type { CategoryStat } from "~/utils/analytics";

const props = defineProps<{
  stats: CategoryStat[];
}>();

const emit = defineEmits<{
  (e: "click-category", id: string): void;
}>();

const { getGoal } = useCategoryGoals();

// Массив stats уже отсортирован по убыванию суммы в aggregateCategoryStats
const maxAmount = computed(() => props.stats[0]?.amount ?? 0);
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <AnalyticsCategoryItem
      v-for="stat in stats"
      :key="stat.categoryId"
      :stat="stat"
      :max-amount="maxAmount"
      :goal="getGoal(stat.categoryId)"
      @click="emit('click-category', stat.categoryId)"
    />

    <div
      v-if="stats.length === 0"
      class="text-center text-text-secondary text-sm py-3"
    >
      Нет трат за этот период
    </div>
  </div>
</template>
