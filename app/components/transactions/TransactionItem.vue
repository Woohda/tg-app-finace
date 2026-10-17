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
  variant?: "default" | "analytics" | "receipt";
}

const props = withDefaults(defineProps<Props>(), {
  class: undefined,
  interactive: false,
  icon: undefined,
  subtitle: undefined,
  showFullDate: false,
  variant: "default",
});

const emit = defineEmits<{
  click: [];
  edit: [];
  delete: [];
}>();

const formattedAmount = computed(() => formatAmount(props.amount, props.type));
const formattedDate = computed(() =>
  formatDate(props.date, props.showFullDate),
);

function onItemClick() {
  if (!props.interactive) return;
  emit("click");
  emit("edit");
}
</script>

<template>
  <SwipeableRow
    :disabled="!interactive"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="
      interactive ? `${title}, ${formattedAmount}, ${formattedDate}` : undefined
    "
    :class="
      cn(
        'group transaction-item rounded-2xl outline-none a11y-focus',
        props.class,
      )
    "
    :content-class="
      cn(
        'transaction-content flex items-center bg-transparent',
        variant === 'analytics'
          ? 'justify-between gap-3 p-2 border-b border-black/7 group-last:border-none'
          : variant === 'receipt'
            ? 'gap-2 py-3 px-2 transition-colors hover:bg-black/3 border-b border-dotted border-text-secondary/20 group-last:border-none'
            : 'gap-2 pb-3 border-b border-black/6 group-last:border-none',
        interactive && 'cursor-pointer active:opacity-80',
      )
    "
    @click="onItemClick"
    @keydown.enter="onItemClick"
    @keydown.space.prevent="onItemClick"
    @delete="emit('delete')"
  >
    <!-- Режим analytics: минималистичный вид без иконки категории -->
    <template v-if="variant === 'analytics'">
      <div class="flex-1 min-w-0 pr-2">
        <p
          class="text-[15px] font-medium text-text-primary truncate tracking-wide"
        >
          {{ title }}
        </p>
        <div class="w-full flex text-xs text-text-secondary">
          <span class="shrink-0">{{ formattedDate }}</span>
          <span v-if="subtitle" class="truncate">,&nbsp;{{ subtitle }}</span>
        </div>
      </div>

      <!-- Сумма -->
      <div class="text-right shrink-0">
        <p
          class="font-bold text-[15px]"
          :class="type === 'income' ? 'text-text-accent' : 'text-text-primary'"
        >
          {{ formattedAmount }}
        </p>
      </div>
    </template>

    <!-- Режим receipt: позиция кассового чека -->
    <template v-else-if="variant === 'receipt'">
      <!-- Иконка категории в стеклянном бейдже -->
      <div
        v-if="icon"
        class="shrink-0 size-8.5 rounded-xl flex items-center justify-center text-lg glass-pill"
      >
        {{ icon }}
      </div>

      <!-- Центральная колонка: Название и дата/подпись с защитой от переполнения -->
      <div class="flex-1 min-w-0 flex flex-col justify-center">
        <p
          class="text-[14px] font-semibold text-text-primary tracking-tight truncate leading-snug"
          :title="title"
        >
          {{ title }}
        </p>
        <div
          class="flex items-center text-xs text-text-secondary mt-0.5 min-w-0"
        >
          <span class="shrink-0">{{ formattedDate }}</span>
          <span v-if="subtitle" class="truncate">,&nbsp;{{ subtitle }}</span>
        </div>
      </div>

      <!-- Сумма справа: фиксированная ширина содержимого, не сжимается и не переносится -->
      <div class="text-right shrink-0">
        <span
          class="font-bold text-[14px] tabular-nums whitespace-nowrap"
          :class="type === 'income' ? 'text-text-accent' : 'text-text-primary'"
        >
          {{ formattedAmount }}
        </span>
      </div>
    </template>

    <!-- Режим default: стандартный вид с иконкой категории -->
    <template v-else>
      <!-- Иконка категории -->
      <div
        v-if="icon"
        class="shrink-0 size-11 rounded-2xl glass- flex items-center justify-center text-xl glass-pill"
      >
        {{ icon }}
      </div>

      <!-- Название + описание + дата -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-text-primary tracking-wide truncate">
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
          :class="type === 'income' ? 'text-text-accent' : 'text-text-primary'"
        >
          {{ formattedAmount }}
        </p>
      </div>
    </template>
  </SwipeableRow>
</template>

<style scoped></style>
