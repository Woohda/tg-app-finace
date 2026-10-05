<script setup lang="ts">
/**
 * @module app/components/goals/CategoryGoalCard
 * @fileoverview Карточка управления месячной целью расходов по категории
 * @description
 * Отображает текущий лимит расходов, статус выполнения, сумму остатка или перерасхода,
 * динамический прогресс-бар, темп расходования лимита (день исчерпания и безопасный темп покупок/дней)
 * и предоставляет инлайн-форму для создания, изменения и удаления цели.
 * Используется в модальном окне аналитики категории.
 * ---
 * ### Логика работы:
 * 1. Получает `categoryId`, `monthSpent`, прогноз расходов `forecast` и медианный чек `medianCheck` из пропсов.
 * 2. Синхронизирует значение цели через `useCategoryGoals`.
 * 3. Рассчитывает процент выполнения лимита, сумму остатка или перерасхода.
 * 4. Вычисляет темп расходования лимита (Goal Pacing) через `calculateCategoryGoalPacing`:
 *    - при риске перерасхода вычисляет день исчерпания («При текущем темпе лимит закончится 18 октября»);
 *    - рассчитывает запас лимита в количестве покупок по медианному чеку («Чтобы уложиться в лимит: не более 8 покупок (медианный чек 500,00 ₽)»);
 *    - при отсутствии медианы переключается на суточный лимит («не более 350,00 ₽/день»).
 * 5. Предоставляет инлайн-редактирование суммы цели с валидацией и тактильным откликом.
 * 6. Позволяет сбросить цель при нажатии на кнопку удаления.
 */
import { computed, ref, watch } from "vue";
import {
  Target,
  Pencil,
  RussianRuble,
  Trash2,
  Plus,
  X,
  CalendarClock,
  ShieldCheck,
  AlertCircle,
} from "@lucide/vue";
import { formatAmount } from "~/utils/format";
import { formatDayMonth } from "~/utils/date";
import { getHapticFeedback } from "~/utils/haptics";
import { calculateCategoryGoalPacing } from "~/utils/analytics";

interface Props {
  categoryId: string | null;
  monthSpent: number;
  forecast?: number | null;
  medianCheck?: number | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "saved" | "delete"): void;
}>();

const { getGoal, setGoal, removeGoal } = useCategoryGoals();
const haptics = getHapticFeedback();

const currentGoalAmount = computed(() => {
  if (!props.categoryId) return null;
  return getGoal(props.categoryId);
});

const goalProgress = computed(() => {
  const goal = currentGoalAmount.value;
  if (!goal || goal <= 0) return null;
  const spent = props.monthSpent;
  const percent = Math.round((spent / goal) * 100);
  const isOverspent = spent > goal;
  const remaining = Math.max(0, goal - spent);
  const overspent = Math.max(0, spent - goal);
  const barWidth = Math.min(percent, 100);
  return {
    goal,
    spent,
    percent,
    isOverspent,
    remaining,
    overspent,
    barWidth,
  };
});

const goalPacing = computed(() => {
  const goal = currentGoalAmount.value;
  if (!goal || goal <= 0) return null;
  return calculateCategoryGoalPacing({
    goal,
    monthSpent: props.monthSpent,
    forecast: props.forecast,
    medianCheck: props.medianCheck,
  });
});

const formattedExhaustionDate = computed(() => {
  if (!goalPacing.value?.exhaustionDate) return null;
  return formatDayMonth(goalPacing.value.exhaustionDate);
});

const isEditingGoal = ref(false);
const goalInputValue = ref<string | number>("");
const goalInputError = ref<string | null>(null);
const isSubmittingGoal = ref(false);
const buttonState = ref<"idle" | "loading" | "success">("idle");

const isSubmitDisabled = computed(() => {
  return isSubmittingGoal.value || buttonState.value !== "idle";
});

watch(goalInputValue, () => {
  if (goalInputError.value) {
    goalInputError.value = null;
  }
});

const startEditGoal = () => {
  goalInputValue.value = currentGoalAmount.value
    ? String(currentGoalAmount.value)
    : "";
  goalInputError.value = null;
  buttonState.value = "idle";
  isEditingGoal.value = true;
};

const cancelEditGoal = () => {
  isEditingGoal.value = false;
  goalInputValue.value = "";
  goalInputError.value = null;
  buttonState.value = "idle";
};

const handleSaveGoal = async () => {
  if (!props.categoryId || buttonState.value !== "idle") return;

  const raw = String(goalInputValue.value ?? "").trim();
  if (!raw) {
    goalInputError.value = "Укажите сумму лимита";
    haptics.notification("error");
    return;
  }

  const num = Number(raw);
  if (isNaN(num) || num <= 0) {
    goalInputError.value = "Сумма должна быть больше 0";
    haptics.notification("error");
    return;
  }
  if (num > 100_000_000) {
    goalInputError.value = "Сумма не может превышать 100 млн";
    haptics.notification("error");
    return;
  }

  goalInputError.value = null;
  isSubmittingGoal.value = true;
  buttonState.value = "loading";

  const success = await setGoal(props.categoryId, Math.round(num));
  isSubmittingGoal.value = false;

  if (success) {
    buttonState.value = "success";
    setTimeout(() => {
      isEditingGoal.value = false;
      buttonState.value = "idle";
      emit("saved");
    }, 600);
  } else {
    buttonState.value = "idle";
  }
};

const handleDeleteGoal = async () => {
  if (!props.categoryId) return;
  isSubmittingGoal.value = true;
  const success = await removeGoal(props.categoryId);
  isSubmittingGoal.value = false;
  isEditingGoal.value = false;
  if (success) {
    emit("delete");
  }
};

watch(
  () => props.categoryId,
  () => {
    cancelEditGoal();
  },
);
</script>

<template>
  <GlassCard class="p-4 flex flex-col gap-3">
    <!-- Режим редактирования цели -->
    <div v-if="isEditingGoal" class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-full glass-pill text-text-accent shadow-xs">
            <Target class="w-5 h-5" />
          </div>
          <span
            class="text-text-primary text-xs font-bold uppercase tracking-wide"
          >
            {{ currentGoalAmount ? "Изменить цель" : "Задать цель на месяц" }}
          </span>
        </div>
        <GlassButton
          variant="soft"
          size="sm"
          class="h-9 px-1.75 shadow-xs"
          aria-label="Отменить"
          @click="cancelEditGoal"
        >
          <X class="w-5 h-5" :stroke-width="1.5" />
        </GlassButton>
      </div>

      <form class="flex flex-col gap-2" @submit.prevent="handleSaveGoal">
        <GlassInput
          v-model="goalInputValue"
          type="number"
          step="1"
          inputmode="numeric"
          label="Месячный лимит"
          placeholder="Например, 15000"
          :icon="RussianRuble"
        />

        <div
          v-if="goalInputError"
          class="text-text-accent text-xs font-semibold px-2"
        >
          {{ goalInputError }}
        </div>

        <div class="flex items-center gap-2 mt-1">
          <GlassButton
            type="button"
            variant="soft"
            size="sm"
            class="flex-1 h-10 px-1.75 shadow-xs text-[15px]"
            @click="cancelEditGoal"
          >
            Отмена
          </GlassButton>

          <GlassMorphButton
            type="submit"
            variant="primary"
            size="sm"
            :state="buttonState"
            :disabled="isSubmitDisabled"
            class="flex-1"
          >
            <span class="text-[15px]">Сохранить</span>
          </GlassMorphButton>
        </div>
      </form>
    </div>

    <!-- Режим отображения: Цель уже задана -->
    <div v-else-if="goalProgress" class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="p-1.5 rounded-full glass-pill"
            :class="
              goalProgress.isOverspent
                ? 'text-text-accent'
                : 'text-text-success'
            "
          >
            <Target class="w-5 h-5" />
          </div>
          <div class="flex flex-col">
            <span
              class="text-text-secondary text-[9px] font-bold uppercase tracking-wide"
            >
              Цель на месяц
            </span>
            <span
              class="text-text-primary text-base font-extrabold tracking-tight"
            >
              {{ formatAmount(goalProgress.goal) }}
            </span>
          </div>
        </div>

        <!-- Кнопки действий -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="p-2 rounded-full glass-pill text-text-secondary hover:text-text-primary transition-all active:scale-95 cursor-pointer a11y-focus"
            aria-label="Изменить цель"
            title="Изменить цель"
            @click="startEditGoal"
          >
            <Pencil class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-2 rounded-full glass-pill text-text-secondary hover:text-text-accent transition-all active:scale-95 cursor-pointer a11y-focus"
            aria-label="Сбросить цель"
            title="Сбросить цель"
            :disabled="isSubmittingGoal"
            @click="handleDeleteGoal"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Прогресс-бар -->
      <div
        class="w-full h-2 glass-pill rounded-full overflow-hidden"
        role="progressbar"
        :aria-valuenow="goalProgress.barWidth"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Выполнение цели: ${goalProgress.percent}%`"
      >
        <div
          class="h-full rounded-full transition-all duration-700 ease-out bg-text-accent"
          :style="{ width: `${goalProgress.barWidth}%` }"
        />
      </div>

      <!-- Статистика выполнения: текст сверху, числа снизу -->
      <div class="flex items-center justify-between gap-2 pt-0.5">
        <!-- Потрачено -->
        <div class="flex flex-col">
          <span
            class="text-text-secondary text-[10px] font-medium leading-tight"
          >
            Потрачено ({{ goalProgress.percent }}%):
          </span>
          <span
            class="text-text-primary text-xs font-extrabold tracking-tight whitespace-nowrap mt-0.5"
          >
            {{ formatAmount(goalProgress.spent) }}
          </span>
        </div>

        <!-- Осталось / Перерасход -->
        <div class="flex flex-col items-end text-right">
          <span
            class="text-text-secondary text-[10px] font-medium leading-tight"
          >
            {{ goalProgress.isOverspent ? "Перерасход" : "Остаток лимита" }}:
          </span>
          <span
            class="text-xs font-extrabold tracking-tight whitespace-nowrap mt-0.5"
            :class="
              goalProgress.isOverspent
                ? 'text-text-accent'
                : 'text-text-success'
            "
          >
            {{
              goalProgress.isOverspent
                ? formatAmount(goalProgress.overspent)
                : formatAmount(goalProgress.remaining)
            }}
          </span>
        </div>
      </div>

      <!-- Умный темп расходования лимита (Goal Pacing) -->
      <div v-if="goalPacing" class="flex flex-col gap-1.5">
        <!-- Предупреждение о дне исчерпания лимита при прогнозном перерасходе -->
        <div
          v-if="goalPacing.isOverspendProjected && formattedExhaustionDate"
          class="flex items-center gap-2 p-2 rounded-xl glass-pill bg-text-accent/10 border border-text-accent/20 text-[10px]"
        >
          <CalendarClock class="w-4 h-4 text-text-accent shrink-0 mt-0.5" />
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="font-bold text-text-primary leading-tight">
              При текущем темпе лимит закончится
              <span
                class="text-text-accent font-extrabold underline underline-offset-2"
              >
                {{ formattedExhaustionDate }}
              </span>
            </span>
            <span class="text-text-secondary leading-tight">
              Чтобы уложиться в лимит:
              <span class="font-bold text-text-primary">
                {{ goalPacing.paceText }}
              </span>
            </span>
          </div>
        </div>

        <!-- Позитивное состояние: темп в норме или безопасный остаток -->
        <div
          v-else-if="!goalPacing.isAlreadyOverspent"
          class="flex items-start justify-between gap-px text-xs text-text-secondary px-0.5"
        >
          <div class="flex items-center gap-1">
            <ShieldCheck class="w-3.5 h-3.5 text-text-success shrink-0" />
            <span class="whitespace-nowrap">
              {{
                goalPacing.remainingChecksByMedian !== null
                  ? "Запас по покупкам:"
                  : "Безопасный суточный темп:"
              }}
            </span>
          </div>
          <span
            class="w-28 text-[10px] font-bold text-text-primary text-right whitespace-wrap"
          >
            {{ goalPacing.paceText }}
          </span>
        </div>

        <!-- Лимит уже фактически исчерпан прямо сейчас -->
        <div
          v-else
          class="flex items-center gap-1 text-[11px] text-text-accent px-0.5"
        >
          <AlertCircle class="w-3.5 h-3.5 shrink-0" />
          <span class="leading-tight">
            Лимит исчерпан. До конца месяца еще
            {{ goalPacing.remainingDays }} дн.
          </span>
        </div>
      </div>
    </div>

    <!-- Режим отображения: Цель еще не задана -->
    <div v-else class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <div
          class="size-10 rounded-full glass-pill flex items-center justify-center shrink-0"
        >
          <span class="text-[22px]">🎯</span>
        </div>
        <div class="flex flex-col">
          <span class="text-text-primary text-xs font-bold">
            Цель на месяц не задана
          </span>
          <span class="text-text-secondary text-[11px]">
            Задайте лимит для отслеживания трат
          </span>
        </div>
      </div>

      <button
        type="button"
        class="flex items-center gap-1 px-3.25 py-2.25 rounded-full glass-pill text-text-accent hover:text-text-primary transition-all active:scale-95 cursor-pointer a11y-focus"
        @click="startEditGoal"
      >
        <Plus class="w-3.5 h-3.5" :stroke-width="2" />
        <span class="text-xs font-bold">Цель</span>
      </button>
    </div>
  </GlassCard>
</template>
