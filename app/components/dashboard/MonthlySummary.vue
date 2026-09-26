<script setup lang="ts">
/**
 * @module app/components/dashboard/MonthlySummary
 * @fileoverview Краткая сводка доходов и расходов за месяц.
 * @description
 * Отображает две карточки: Доходы и Расходы, подсвечивая ту, сумма в которой больше.
 * Отображает скелетоны во время загрузки данных транзакций.
 */
import { computed } from "vue";
import { BanknoteArrowUp, BanknoteArrowDown } from "@lucide/vue";
import { formatAmount } from "~/utils/format";

const props = defineProps<{
  income: number;
  expense: number;
  isLoading?: boolean;
}>();

const isIncomeBigger = computed(() => {
  if (props.isLoading) return true;
  return props.income >= props.expense;
});
</script>

<template>
  <div class="flex items-center justify-center w-5/6 mx-auto">
    <!-- Доход -->
    <div
      class="relative flex-1 flex flex-col items-center justify-center gap-px py-3 rounded-4xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] bg-transparent!"
      :class="[
        isLoading
          ? 'z-10 scale-95 opacity-90'
          : isIncomeBigger
            ? 'z-20 scale-100 opacity-100 shadow-[0_4px_20px_rgba(34,197,94,0.3)]! blur-0'
            : 'z-10 scale-90 blur-[0.5px]',
      ]"
    >
      <div
        class="absolute inset-0 rounded-4xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] -z-10"
        :class="[
          isLoading || isIncomeBigger
            ? 'glass-pill'
            : 'bg-white/40 border border-transparent',
        ]"
      />
      <div
        class="flex items-center gap-1.5 transition-colors duration-300"
        :class="
          isLoading
            ? 'text-text-secondary'
            : isIncomeBigger
              ? 'text-text-success'
              : 'text-text-secondary'
        "
      >
        <BanknoteArrowUp class="w-6 h-6" stroke-width="1.5" />
        <span class="text-xs font-bold tracking-wide uppercase">Доходы</span>
      </div>
      <Skeleton v-if="isLoading" class="w-20 h-5 rounded-xl" />
      <span
        v-else
        class="font-extrabold text-sm transition-colors duration-300"
        :class="isIncomeBigger ? 'text-text-primary' : 'text-text-secondary'"
      >
        {{ formatAmount(income) }}
      </span>
    </div>

    <!-- Трата -->
    <div
      class="relative flex-1 flex flex-col items-center justify-center gap-px py-3 rounded-4xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] -ml-4 bg-transparent!"
      :class="[
        isLoading
          ? 'z-10 scale-95 opacity-90'
          : !isIncomeBigger
            ? 'z-20 scale-100 opacity-100 shadow-[0_4px_20px_rgba(225,29,72,0.3)]! blur-0'
            : 'z-10 scale-90 blur-[0.5px]',
      ]"
    >
      <div
        class="absolute inset-0 rounded-4xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] -z-10"
        :class="[
          isLoading || !isIncomeBigger
            ? 'glass-pill'
            : 'bg-white/40 border border-transparent',
        ]"
      />
      <div
        class="flex items-center gap-1.5 transition-colors duration-300"
        :class="
          isLoading
            ? 'text-text-secondary'
            : !isIncomeBigger
              ? 'text-text-accent'
              : 'text-text-secondary'
        "
      >
        <BanknoteArrowDown class="w-6 h-6" stroke-width="1.5" />
        <span class="text-xs font-bold tracking-wide uppercase">Расходы</span>
      </div>
      <Skeleton v-if="isLoading" class="w-20 h-5 rounded-xl" />
      <span
        v-else
        class="font-extrabold text-sm transition-colors duration-300"
        :class="!isIncomeBigger ? 'text-text-primary' : 'text-text-secondary'"
      >
        {{ formatAmount(expense) }}
      </span>
    </div>
  </div>
</template>
