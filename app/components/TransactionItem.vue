<script setup lang="ts">
/**
 * @module app/components/TransactionItem
 * @fileoverview Неоморфная карточка одной транзакции в списке
 * @description
 * Отображает иконку категории, название, описание, дату и сумму.
 * Расходы показываются красным со знаком «−», доходы — зелёным со знаком «+».
 * ---
 * ### Особенности:
 * - Стиль Pure Neumorphism: выдавленная карточка с мягкими тенями
 * - Тактильная обратная связь при нажатии (active:shadow-neu-pressed + scale)
 * - Форматирование суммы в рубли через Intl.NumberFormat
 */
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils";

interface Props {
  class?: HTMLAttributes["class"];
  icon: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
}

const props = defineProps<Props>();

const formattedAmount = computed(() => formatAmount(props.amount, props.type));
const formattedDate = computed(() => formatDate(props.date));
</script>

<template>
  <div
    :class="
      cn(
        'flex items-center gap-4 py-2 border-b border-black/5 last:border-0',
        props.class,
      )
    "
  >
    <!-- Иконка категории (как отдельная ячейка) -->
    <div
      class="shrink-0 size-12 rounded-2xl bg-milky shadow-neu-flat flex items-center justify-center text-xl border-[0.5px] border-white/50 border-b-transparent border-r-transparent"
    >
      {{ icon }}
    </div>

    <!-- Название + описание + дата -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-text-primary truncate">{{ name }}</p>
      <p class="text-xs text-text-secondary truncate mt-0.5">
        {{ formattedDate }}
      </p>
    </div>

    <!-- Сумма и Тип -->
    <div class="text-right">
      <p
        class="font-bold text-[15px]"
        :class="type === 'income' ? 'text-text-accent' : 'text-text-primary'"
      >
        {{ formattedAmount }}
      </p>
    </div>
  </div>
</template>
