<script setup lang="ts">
/**
 * @module app/components/analytics/AnalyticsCategoryItem
 * @fileoverview Элемент списка категорий с прогресс-баром цели
 * @description
 * Отображает одну категорию расходов, соотношение фактических трат к заданной цели
 * и визуальный прогресс-бар с индикатором перерасхода.
 * ---
 * ### Логика работы:
 * 1. Получает данные категории и максимальную сумму трат из пропсов.
 * 2. Запрашивает установленную цель через `useCategoryGoals`.
 * 3. Рассчитывает процент выполнения, состояние перерасхода и заполнение прогресс-бара.
 */
import { computed } from "vue";
import type { CategoryStat } from "~/utils/analytics";
import { formatAmount } from "~/utils/format";
import { ChevronRight } from "@lucide/vue";
import { useCategoryGoals } from "~/composables/useCategoryGoals";

interface Props {
  stat: CategoryStat;
  maxAmount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "click"): void;
}>();

const { getGoal } = useCategoryGoals();

interface CategoryProgress {
  hasGoal: boolean;
  goal: number | null;
  percent: number;
  isOverspent: boolean;
  barWidth: number;
}

const progress = computed<CategoryProgress>(() => {
  const goal = getGoal(props.stat.categoryId);
  if (goal && goal > 0) {
    const percent = Math.round((props.stat.amount / goal) * 100);
    const isOverspent = props.stat.amount > goal;
    const barWidth = Math.min(percent, 100);
    return {
      hasGoal: true,
      goal,
      percent,
      isOverspent,
      barWidth,
    };
  }

  // Относительный расчет, если цель не задана
  const relativePercent =
    props.maxAmount > 0
      ? Math.round((props.stat.amount / props.maxAmount) * 100)
      : 0;

  return {
    hasGoal: false,
    goal: null,
    percent: relativePercent,
    isOverspent: false,
    barWidth: relativePercent,
  };
});
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :aria-label="`${stat.categoryName}: ${formatAmount(stat.amount)}, ${stat.percent}% от трат`"
    class="flex flex-col gap-2 p-3 rounded-2xl glass-milky border-[0.5px] border-white/40 active:scale-[0.98] transition-transform cursor-pointer outline-none a11y-focus"
    @click="emit('click')"
    @keydown.enter.prevent="emit('click')"
    @keydown.space.prevent="emit('click')"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <div
          class="w-9 h-9 flex items-center justify-center glass-pill rounded-full text-base shrink-0"
        >
          {{ stat.categoryIcon || "📂" }}
        </div>
        <div class="flex flex-col min-w-0">
          <span
            class="text-text-primary font-bold text-sm truncate tracking-wide"
          >
            {{ stat.categoryName }}
          </span>
          <span class="text-[11px] text-text-secondary">{{
            `${stat.percent}% от расходов за месяц`
          }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2 text-right shrink-0">
        <div class="flex flex-col items-end">
          <div class="flex items-baseline justify-end gap-1 whitespace-nowrap">
            <span class="text-text-primary font-extrabold text-sm">{{
              formatAmount(stat.amount)
            }}</span>
          </div>

          <span
            class="text-[10px] uppercase font-bold whitespace-nowrap tracking-wide"
            :class="
              progress.hasGoal
                ? progress.isOverspent
                  ? 'text-text-accent'
                  : 'text-text-success'
                : 'text-text-secondary font-semibold'
            "
          >
            {{
              progress.hasGoal
                ? `${progress.percent}% ${
                    progress.isOverspent ? "• перерасход" : "от цели"
                  }`
                : `Без цели`
            }}
          </span>
        </div>
        <ChevronRight class="w-4 h-4 text-text-secondary opacity-50 shrink-0" />
      </div>
    </div>

    <!-- Прогресс бар (только если установлена цель) -->
    <div
      v-if="progress.hasGoal"
      class="w-full h-1.5 glass-pill rounded-full overflow-hidden"
      role="progressbar"
      :aria-valuenow="progress.barWidth"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Прогресс: ${progress.percent}%`"
    >
      <div
        class="h-full rounded-full transition-all duration-700 ease-out bg-text-accent"
        :style="{
          width: `${progress.barWidth}%`,
        }"
      />
    </div>
  </div>
</template>
