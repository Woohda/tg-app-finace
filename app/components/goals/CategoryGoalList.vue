<script setup lang="ts">
/**
 * @module app/components/goals/CategoryGoalList
 * @fileoverview Список целей расходов по категориям со сводкой и пустым состоянием
 * @description
 * Отображает заголовок секции с подсчетом суммы запланированных лимитов и доли от бюджета,
 * кнопку добавления новой цели, список строк `CategoryGoalItem` со свайпом для удаления
 * и информативное пустое состояние при отсутствии целей.
 * ---
 * ### Логика работы:
 * 1. Получает массив целей `goals`, сумму общего бюджета и флаг доступности категорий через пропсы.
 * 2. Вычисляет общую сумму всех установленных целей трат.
 * 3. Отрисовывает элементы списка `CategoryGoalItem` со свайп-удалением и редактированием по тапу.
 * 4. Генерирует события `add`, `edit` и `delete` для управления целями на родительской странице.
 */
import { computed } from "vue";
import { Target, Plus } from "@lucide/vue";
import { formatAmount } from "~/utils/format";

export interface GoalItemData {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  targetAmount: number;
  spent: number;
}

interface Props {
  goals: GoalItemData[];
  budget?: number;
  canAddGoal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  budget: 0,
  canAddGoal: true,
});

const emit = defineEmits<{
  add: [];
  edit: [goal: GoalItemData];
  delete: [categoryId: string];
}>();

const totalGoalsAmount = computed(() => {
  return props.goals.reduce((sum, g) => sum + g.targetAmount, 0);
});

const isExceedingBudget = computed(() => {
  return props.budget > 0 && totalGoalsAmount.value > props.budget;
});

const budgetPercent = computed(() => {
  if (props.budget <= 0) return 0;
  return Math.round((totalGoalsAmount.value / props.budget) * 100);
});
</script>

<template>
  <GlassCard class="flex flex-col gap-4">
    <!-- Шапка секции -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <div
          class="size-12.5 rounded-full glass-pill flex items-center justify-center shrink-0"
        >
          <span class="text-[28px]">🎯</span>
        </div>
        <div class="flex flex-col min-w-0">
          <h2 class="text-text-primary font-bold text-base truncate">
            Цели по категориям
          </h2>
          <div class="text-xs truncate">
            <template v-if="goals.length > 0">
              <span class="text-text-secondary"
                >Лимиты: {{ formatAmount(totalGoalsAmount) }}</span
              >
              <p
                v-if="budget > 0"
                :class="
                  isExceedingBudget ? 'text-text-accent' : 'text-text-success'
                "
              >
                ({{ budgetPercent }}% бюджета)
              </p>
            </template>
            <span v-else class="text-text-secondary">
              Лимиты трат по отдельным статьям
            </span>
          </div>
        </div>
      </div>

      <!-- Кнопка добавления цели -->
      <button
        v-if="canAddGoal"
        type="button"
        class="p-3 rounded-full glass-pill text-text-accent hover:text-text-primary transition-all active:scale-95 cursor-pointer a11y-focus"
        @click="emit('add')"
      >
        <Plus class="w-6 h-6" :stroke-width="2" />
      </button>
    </div>

    <!-- Список установленных целей -->
    <div v-if="goals.length > 0" class="flex flex-col gap-2.5">
      <CategoryGoalItem
        v-for="goal in goals"
        :key="goal.categoryId"
        :category-id="goal.categoryId"
        :category-name="goal.categoryName"
        :category-icon="goal.categoryIcon"
        :target-amount="goal.targetAmount"
        :spent="goal.spent"
        @edit="emit('edit', goal)"
        @delete="emit('delete', goal.categoryId)"
      />
    </div>

    <!-- Пустое состояние -->
    <div
      v-else
      class="flex flex-col items-center justify-center gap-3 py-6 px-4 text-center rounded-2xl glass-milky border-[0.5px] border-white/30"
    >
      <div
        class="size-12 rounded-full glass-pill shadow-glass-inner flex items-center justify-center text-text-accent"
      >
        <Target class="w-6 h-6" />
      </div>
      <div class="flex flex-col gap-1 max-w-64">
        <h3 class="text-text-primary font-bold text-sm">
          Цели по категориям еще не заданы
        </h3>
        <p class="text-text-secondary text-xs">
          Установите лимиты на категории (например, Продукты, Кафе, Такси),
          чтобы контролировать расходы
        </p>
      </div>

      <GlassButton
        v-if="canAddGoal"
        type="button"
        variant="primary"
        size="sm"
        class="h-10 px-5 mt-1 shadow-xs font-semibold"
        @click="emit('add')"
      >
        <Plus class="w-4 h-4 mr-1.5" :stroke-width="2" />
        <span>Установить цель</span>
      </GlassButton>
    </div>
  </GlassCard>
</template>
