<script setup lang="ts">
/**
 * @module app/components/goals/CategoryGoalList
 * @fileoverview Список целей расходов по категориям со сводкой и пустым состоянием
 * @description
 * Отображает заголовок секции с подсчетом суммы запланированных лимитов и доли от бюджета,
 * кнопку добавления новой цели, скелетоны во время загрузки, список строк `CategoryGoalItem`
 * со свайпом для удаления и информативное пустое состояние при отсутствии целей.
 * ---
 * ### Логика работы:
 * 1. Получает массив целей `goals`, сумму общего бюджета, флаг загрузки `loading` и флаг доступности категорий через пропсы.
 * 2. При `loading === true` отображает мерцающие скелетоны карточек `Skeleton`.
 * 3. Вычисляет общую сумму всех установленных целей трат.
 * 4. Отрисовывает элементы списка `CategoryGoalItem` со свайп-удалением и редактированием по тапу.
 * 5. Генерирует события `add`, `edit` и `delete` для управления целями на родительской странице.
 */
import { computed } from "vue";
import { Plus } from "@lucide/vue";
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
  loading?: boolean;
  skeletonCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  budget: 0,
  canAddGoal: true,
  loading: false,
  skeletonCount: 3,
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
            <template v-if="loading">
              <Skeleton class="h-3.5 w-32 rounded-md mt-0.5" />
            </template>
            <template v-else-if="goals.length > 0">
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
        v-if="goals.length"
        type="button"
        class="p-3 rounded-full glass-pill text-text-accent hover:text-text-primary transition-all active:scale-95 cursor-pointer a11y-focus"
        @click="emit('add')"
      >
        <Plus class="w-6 h-6" :stroke-width="2" />
      </button>
    </div>

    <!-- Скелетон загрузки списка целей -->
    <div v-if="loading" class="flex flex-col gap-2.5">
      <div
        v-for="i in skeletonCount"
        :key="i"
        class="glass-pill rounded-4xl py-3 px-5 flex flex-col gap-2.5"
      >
        <div class="flex items-center justify-between gap-2">
          <!-- Название категории и потраченная сумма -->
          <div class="flex flex-col gap-1.5 min-w-0 flex-1">
            <Skeleton
              class="h-4 rounded-md"
              :class="i === 1 ? 'w-28' : i === 2 ? 'w-36' : 'w-24'"
            />
            <Skeleton
              class="h-3 rounded-md"
              :class="i === 1 ? 'w-20' : i === 2 ? 'w-24' : 'w-16'"
            />
          </div>

          <!-- Сумма лимита и процент -->
          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <Skeleton
              class="h-4 rounded-md"
              :class="i === 1 ? 'w-16' : i === 2 ? 'w-20' : 'w-14'"
            />
            <Skeleton
              class="h-3 rounded-md"
              :class="i === 1 ? 'w-14' : i === 2 ? 'w-16' : 'w-12'"
            />
          </div>
        </div>

        <!-- Прогресс-бар цели -->
        <Skeleton class="w-full h-1.5" rounded="rounded-full" />
      </div>
    </div>

    <!-- Список установленных целей -->
    <div v-else-if="goals.length > 0" class="flex flex-col gap-2.5">
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
    <div v-else class="flex flex-col items-center justify-center gap-3">
      <div
        class="flex flex-col gap-1 items-center text-center glass-pill rounded-4xl p-4"
      >
        <h3 class="text-text-primary font-bold text-[15px]">
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
        class="w-full gap-0.5"
        @click="emit('add')"
      >
        <Plus class="w-5 h-5" :stroke-width="2" />
        <span class="text-base">Добавить первую цель</span>
      </GlassButton>
    </div>
  </GlassCard>
</template>
