<script setup lang="ts">
/**
 * @module app/components/goals/CategoryGoalItem
 * @fileoverview Элемент списка целей расходов по категории со свайпом
 * @description
 * Отображает строку цели в списке: иконку, название категории, лимит,
 * сумму фактических трат и прогресс-бар. Поддерживает редактирование по тапу
 * и удаление свайпом влево через `SwipeableRow`.
 * ---
 * ### Логика работы:
 * 1. Получает данные о категории, установленном лимите и сумме трат через пропсы.
 * 2. Вычисляет процент расходования лимита и статус перерасхода.
 * 3. Отрисовывает прогресс-бар акцентного цвета.
 * 4. Вызывает `edit` при обычном клике/тапе по карточке.
 * 5. Вызывает `delete` при свайпе влево через компонент `SwipeableRow`.
 */
import { computed } from "vue";
import { formatAmount } from "~/utils/format";

interface Props {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  targetAmount: number;
  spent: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "edit" | "delete"): void;
}>();

const percent = computed(() => {
  if (props.targetAmount <= 0) return 0;
  return Math.round((props.spent / props.targetAmount) * 100);
});

const isOverspent = computed(() => props.spent > props.targetAmount);

const barWidth = computed(() => Math.min(percent.value, 100));
</script>

<template>
  <SwipeableRow
    role="button"
    tabindex="0"
    :aria-label="`${categoryName}: лимит ${formatAmount(targetAmount)}, потрачено ${formatAmount(spent)} (${percent}%)`"
    class="glass-pill outline-none overflow-hidden rounded-4xl active:scale-[0.99] transition-transform a11y-focus cursor-pointer"
    content-class="flex flex-col gap-2.5 py-3 px-5 cursor-pointer active:scale-[0.99] transition-transform"
    @click="emit('edit')"
    @delete="emit('delete')"
  >
    <div class="flex items-center justify-between gap-2">
      <!-- Иконка и название категории -->
      <div class="flex flex-col min-w-0">
        <span
          class="text-text-primary font-bold text-sm truncate tracking-wide"
        >
          {{ categoryName }}
        </span>
        <span class="text-[11px] text-text-secondary truncate">
          Потрачено: {{ formatAmount(spent) }}
        </span>
      </div>

      <!-- Сумма лимита и процент -->
      <div class="flex flex-col items-end text-right shrink-0">
        <span
          class="text-text-primary font-extrabold text-sm whitespace-nowrap"
        >
          {{ formatAmount(targetAmount) }}
        </span>
        <span
          class="text-[10px] uppercase font-bold whitespace-nowrap tracking-wide"
          :class="isOverspent ? 'text-text-accent' : 'text-text-success'"
        >
          {{ percent }}% {{ isOverspent ? "• перерасход" : "от цели" }}
        </span>
      </div>
    </div>

    <!-- Прогресс-бар цели -->
    <div
      class="w-full h-1.5 glass-pill rounded-full overflow-hidden"
      role="progressbar"
      :aria-valuenow="barWidth"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Прогресс выполнения цели: ${percent}%`"
    >
      <div
        class="h-full rounded-full transition-all duration-700 ease-out bg-text-accent"
        :style="{ width: `${barWidth}%` }"
      />
    </div>
  </SwipeableRow>
</template>
