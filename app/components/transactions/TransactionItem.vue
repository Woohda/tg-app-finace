<script setup lang="ts">
/**
 * @module app/components/transaction/TransactionItem
 * @fileoverview Компонент отображения отдельной транзакции в списке.
 * @description
 * Отображает иконку категории, название, дату и сумму транзакции.
 * Цвет суммы зависит от типа транзакции (доход/расход).
 * По клику открывает редактирование транзакции. Свайп влево открывает действие удаления через `SwipeableRow`.
 */
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "~/utils/cn";

interface Props {
  class?: HTMLAttributes["class"];
  icon?: string;
  title: string;
  subtitle?: string | null;
  amount: number;
  type: "income" | "expense";
  date: string;
  interactive?: boolean;
  showFullDate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  class: undefined,
  interactive: false,
  icon: undefined,
  subtitle: undefined,
  showFullDate: false,
});

const emit = defineEmits<{
  click: [];
  delete: [];
}>();

const formattedAmount = computed(() => formatAmount(props.amount, props.type));
const formattedDate = computed(() =>
  formatDate(props.date, props.showFullDate),
);

function onItemClick() {
  if (!props.interactive) return;
  emit("click");
}
</script>

<template>
  <SwipeableRow
    :disabled="!interactive"
    :class="cn('transaction-item rounded-2xl', props.class)"
    :content-class="
      cn(
        'transaction-content flex items-center gap-2 pb-3 bg-transparent border-b border-black/6',
        interactive && 'cursor-pointer active:opacity-80',
      )
    "
    @click="onItemClick"
    @delete="emit('delete')"
  >
    <!-- Иконка категории -->
    <div
      v-if="icon"
      class="shrink-0 size-11 rounded-2xl glass- flex items-center justify-center text-xl border-[0.5px] border-white/50 border-b-transparent border-r-transparent"
      style="
        background: rgba(255, 255, 255, 0.7);
        box-shadow:
          inset 3px 3px 8px rgba(255, 255, 255, 1),
          inset -4px -4px 10px rgba(130, 115, 105, 0.15);
      "
    >
      {{ icon }}
    </div>

    <!-- Название + описание + дата -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-text-primary truncate">
        {{ title }}
      </p>
      <div class="w-full flex text-xs text-text-secondary mt-0.5">
        <span class="shrink-0"> {{ formattedDate }}</span>
        <span v-if="subtitle" class="truncate">,&nbsp;{{ subtitle }}</span>
      </div>
    </div>

    <!-- Сумма -->
    <div class="text-right">
      <p
        class="font-bold text-[15px]"
        :class="
          type === 'income' ? 'text-text-accent' : 'text-text-primary'
        "
      >
        {{ formattedAmount }}
      </p>
    </div>
  </SwipeableRow>
</template>

<style scoped>
.transaction-item:last-child .transaction-content {
  border-bottom-width: 0;
}
</style>
