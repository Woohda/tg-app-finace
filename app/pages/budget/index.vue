<script setup lang="ts">
/**
 * @module app/pages/budget
 * @fileoverview Экран настройки ежемесячного бюджета и целей по категориям
 * @description
 * Позволяет пользователю управлять общим месячным лимитом расходов,
 * а также просматривать, создавать, изменять и удалять лимиты трат по категориям.
 * Делегирует отображение целей компонентам `CategoryGoalList` и `CategoryGoalModal`.
 * ---
 * ### Логика работы:
 * 1. Загрузка общего бюджета (`useBudgets`), категорий (`useCategories`) и целей (`useCategoryGoals`).
 * 2. Агрегация фактических расходов текущего месяца по каждой категории (`useTransactions`).
 * 3. Сохранение общего бюджета с валидацией через `budgetSchema`.
 * 4. Управление целями по категориям через компонент `CategoryGoalList` и модалку `CategoryGoalModal`.
 */
import { ref, watch, computed, onMounted } from "vue";
import { ChevronLeft, RussianRuble } from "@lucide/vue";
import { budgetSchema } from "~/types/validate";
import { parseAmount } from "~/utils/format";
import { formatZodError } from "~/utils/zod";
import { isCurrentMonth } from "~/utils/date";
import type { GoalItemData } from "~/components/goals/CategoryGoalList.vue";

const {
  budget,
  updateBudget,
  isLoading: isBudgetLoading,
  error: budgetError,
  fetchBudget,
} = useBudgets();
const {
  categories,
  fetchCategories,
  isLoading: isCategoriesLoading,
} = useCategories();
const {
  goalsMap,
  fetchGoals,
  removeGoal,
  isLoaded: isGoalsLoaded,
  error: goalsError,
} = useCategoryGoals();
const { transactions } = useTransactions();

const isGoalsLoading = computed(() => {
  return (
    (!isGoalsLoaded.value && !goalsError.value) ||
    (categories.value.length === 0 && isCategoriesLoading.value)
  );
});

const amount = ref<string | number>(budget.value || "");
const buttonState = ref<"idle" | "loading" | "success">("idle");
const localError = ref<string>("");

const isSubmitDisabled = computed(() => {
  if (isBudgetLoading.value) return true;
  const parsed = parseAmount(amount.value);
  return isNaN(parsed) || parsed <= 0;
});

watch(amount, () => {
  if (localError.value) {
    localError.value = "";
  }
});

watch(budget, (newVal) => {
  if (amount.value === "" && newVal > 0) {
    amount.value = newVal;
  }
});

onMounted(() => {
  fetchBudget();
  fetchCategories();
  fetchGoals();
});

const saveBudget = async () => {
  const result = budgetSchema.safeParse({ amount: parseAmount(amount.value) });

  if (!result.success) {
    localError.value = formatZodError(result.error);
    return;
  }

  localError.value = "";
  buttonState.value = "loading";

  const success = await updateBudget(result.data.amount);

  if (success) {
    buttonState.value = "success";
    setTimeout(() => {
      buttonState.value = "idle";
    }, 1500);
  } else {
    buttonState.value = "idle";
  }
};

// --- Цели по категориям ---
const expenseCategories = computed(() => {
  return categories.value.filter((c) => c.type === "expense");
});

const currentMonthExpensesByCategory = computed(() => {
  const map: Record<string, number> = {};
  if (!transactions.value?.length) return map;

  for (const tx of transactions.value) {
    if (tx.type === "expense" && tx.categoryId && isCurrentMonth(tx.date)) {
      map[tx.categoryId] = (map[tx.categoryId] || 0) + (tx.amount || 0);
    }
  }
  return map;
});

const categoryGoalsList = computed<GoalItemData[]>(() => {
  const list: GoalItemData[] = [];
  for (const cat of expenseCategories.value) {
    const goal = goalsMap.value[cat.id];
    if (goal && goal > 0) {
      list.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon || "📂",
        targetAmount: goal,
        spent: currentMonthExpensesByCategory.value[cat.id] || 0,
      });
    }
  }
  // Сортировка: сначала категории с наибольшим расходом относительно цели
  return list.sort((a, b) => {
    const ratioA = a.targetAmount > 0 ? a.spent / a.targetAmount : 0;
    const ratioB = b.targetAmount > 0 ? b.spent / b.targetAmount : 0;
    return ratioB - ratioA;
  });
});

const availableCategoriesForGoal = computed(() => {
  return expenseCategories.value
    .filter((c) => !goalsMap.value[c.id])
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      type: c.type,
    }));
});

// Модальное окно создания / редактирования цели
const isGoalModalOpen = ref(false);
const isGoalModalEdit = ref(false);
const editingGoal = ref<{
  categoryId: string;
  name: string;
  icon: string;
  amount: number;
} | null>(null);

const openAddGoalModal = () => {
  isGoalModalEdit.value = false;
  editingGoal.value = null;
  isGoalModalOpen.value = true;
};

const openEditGoalModal = (goal: GoalItemData) => {
  isGoalModalEdit.value = true;
  editingGoal.value = {
    categoryId: goal.categoryId,
    name: goal.categoryName,
    icon: goal.categoryIcon,
    amount: goal.targetAmount,
  };
  isGoalModalOpen.value = true;
};

const closeGoalModal = () => {
  isGoalModalOpen.value = false;
  editingGoal.value = null;
};

const handleDeleteGoal = async (categoryId: string) => {
  await removeGoal(categoryId);
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-center justify-center gap-3 relative">
      <NuxtLink
        class="w-12 h-12 absolute left-0 top-1/2 -translate-y-1/2 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 active:scale-95 transition-transform a11y-focus"
        to="/settings"
        aria-label="Назад к настройкам"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </NuxtLink>
      <div class="flex flex-col text-center">
        <h1 class="text-text-primary text-xl font-bold tracking-wide">
          Бюджет и цели
        </h1>
        <p class="text-text-secondary text-xs">Планирование финансов</p>
      </div>
    </div>

    <!-- Monthly Budget -->
    <GlassCard class="flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div
          class="size-12.5 rounded-full glass-pill flex items-center justify-center shrink-0"
        >
          <span class="text-[28px]">💰</span>
        </div>
        <div class="flex flex-col">
          <h2 class="text-text-primary font-bold">Бюджет на месяц</h2>
          <p class="text-text-secondary text-xs">Общий лимит на все траты</p>
        </div>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="saveBudget">
        <GlassInput
          v-model="amount"
          type="number"
          step="1"
          inputmode="numeric"
          label="Сумма"
          placeholder="Например, 60000"
          :icon="RussianRuble"
        />

        <div
          v-if="localError || budgetError"
          class="text-text-accent text-sm text-center"
        >
          {{ localError || budgetError }}
        </div>

        <GlassMorphButton
          type="submit"
          variant="primary"
          :state="buttonState"
          :disabled="isSubmitDisabled"
        >
          <span class="text-xl">🎯</span>
          <span class="text-base">Зафиксировать лимит</span>
        </GlassMorphButton>
      </form>
    </GlassCard>

    <!-- Секция: Список целей по категориям -->
    <CategoryGoalList
      :goals="categoryGoalsList"
      :budget="budget"
      :can-add-goal="availableCategoriesForGoal.length > 0"
      :loading="isGoalsLoading"
      @add="openAddGoalModal"
      @edit="openEditGoalModal"
      @delete="handleDeleteGoal"
    />

    <!-- Модальное окно добавления / изменения цели -->
    <CategoryGoalModal
      :is-open="isGoalModalOpen"
      :is-edit="isGoalModalEdit"
      :initial-category-id="editingGoal?.categoryId"
      :initial-category-name="editingGoal?.name"
      :initial-category-icon="editingGoal?.icon"
      :initial-amount="editingGoal?.amount"
      :available-categories="availableCategoriesForGoal"
      @close="closeGoalModal"
      @saved="closeGoalModal"
    />
  </div>
</template>
