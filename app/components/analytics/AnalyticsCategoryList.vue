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
 * 2. Вычисляет максимальную сумму для относительного масштабирования.
 * 3. Отрисовывает список элементов `AnalyticsCategoryItem`.
 */
import { computed } from "vue";
import type { CategoryStat } from "~/utils/analytics";
import AnalyticsCategoryItem from "./AnalyticsCategoryItem.vue";

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
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <AnalyticsCategoryItem
      v-for="stat in stats"
      :key="stat.categoryId"
      :stat="stat"
      :max-amount="maxAmount"
      @click="emit('click-category', stat.categoryId)"
    />

    <div
      v-if="stats.length === 0"
      class="text-center text-text-secondary text-sm py-4"
    >
      Нет трат за этот период
    </div>
  </div>
</template>

