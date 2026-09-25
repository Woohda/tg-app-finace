<script setup lang="ts">
/**
 * @module app/components/dashboard/BudgetRemainderCard
 * @fileoverview Карточка остатка бюджета на текущий месяц
 * @description
 * Отображает остаток бюджета пользователя до конца месяца (или сумму перерасхода),
 * а также ориентировочную сумму, доступную для ежедневных трат.
 * ---
 * ### Особенности:
 * - Стилистика: Glassmorphism (использует GlassCard)
 * - При отрицательном остатке подсвечивает сумму акцентным цветом и меняет формулировку на перерасход
 */
import { formatAmount } from "~/utils/format";

defineProps<{
  remainder: number;
  dailyGuideline: number;
  lastDayOfMonth: string;
  isLoading?: boolean;
}>();
</script>

<template>
  <GlassCard>
    <div class="flex justify-between items-start">
      <!-- Состояние загрузки: Скелетоны текста -->
      <div v-if="isLoading" class="flex flex-col gap-2 py-1">
        <Skeleton class="w-45 h-4" />
        <Skeleton class="w-40 h-9 rounded-lg" />
        <Skeleton class="w-50 h-3" />
      </div>

      <!-- Загруженное состояние: Текст остатка бюджета -->
      <div v-else class="fade-in">
        <p class="text-base mb-1 text-text-secondary">
          <template v-if="remainder < 0"> Вы превысили бюджет на </template>
          <template v-else> Остаток бюджета до {{ lastDayOfMonth }} </template>
        </p>
        <h2
          class="text-4xl font-extrabold tracking-tight"
          :class="remainder < 0 ? 'text-text-accent' : 'text-text-primary'"
        >
          {{ formatAmount(Math.abs(remainder)) }}
        </h2>

        <p
          v-if="remainder > 0"
          class="text-xs mt-2 tracking-wide flex items-center gap-1 text-text-secondary"
        >
          Можно тратить ~ {{ formatAmount(dailyGuideline) }} / день
        </p>
      </div>
    </div>
  </GlassCard>
</template>
