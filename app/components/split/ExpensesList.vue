<script setup lang="ts">
/**
 * @module app/components/split/ExpensesList
 * @fileoverview Список совместных расходов группы в виде кассовых чеков
 * @description
 * Отображает список трат группы с использованием детализированного компонента чека ExpenseReceiptCard.
 * Поддерживает разворачивание середины чека, экспорт доли в личный бюджет, редактирование и удаление.
 * ---
 * ### Логика работы:
 * 1. Получение массива расходов `expenses` и идентификатора текущего участника `currentMemberId`.
 * 2. Отрисовка пустого состояния при отсутствии расходов.
 * 3. Передача обратной сквозной нумерации чеков (`expenses.length - index`) в компонент `ExpenseReceiptCard`.
 * 4. Проброс событий удаления, редактирования и экспорта на родительскую страницу.
 */
import type { SplitExpense } from "~/types/split";

defineProps<{
  groupId: string;
  expenses: SplitExpense[];
  currentMemberId?: string;
}>();

const emit = defineEmits<{
  (e: "delete", expenseId: string): void;
  (e: "edit", expense: SplitExpense): void;
  (
    e: "exportShare",
    payload: { expense: SplitExpense; shareAmount: number },
  ): void;
}>();
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div
      v-if="expenses.length === 0"
      class="p-8 text-center text-text-secondary text-xs glass-card rounded-3xl"
    >
      Расходов пока нет. Нажмите «+ Добавить расход», чтобы записать первую
      трату!
    </div>

    <ExpenseReceiptCard
      v-for="(e, index) in expenses"
      :key="e.id"
      :expense="e"
      :number="expenses.length - index"
      :current-member-id="currentMemberId"
      @delete="emit('delete', $event)"
      @edit="emit('edit', $event)"
      @export-share="emit('exportShare', $event)"
    />
  </div>
</template>
