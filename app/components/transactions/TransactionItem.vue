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
  variant?: "default" | "analytics";
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
        'transaction-content flex items-center bg-transparent border-b border-black/6 group-last:border-none',
        variant === 'analytics' ? 'justify-between gap-3 p-2' : 'gap-2 pb-3',
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
        <p class="text-base font-semibold text-text-primary truncate">
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
          :class="type === 'income' ? 'text-text-accent' : 'text-text-primary'"
        >
          {{ formattedAmount }}
        </p>
      </div>
    </template>
  </SwipeableRow>
</template>

<style scoped></style>
