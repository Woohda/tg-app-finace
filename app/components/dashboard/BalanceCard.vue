<script setup lang="ts">
/**
 * @module app/components/dashboard/BalanceCard
 * @fileoverview Карточка общего баланса с мини-графиком (Sparkline)
 * @description
 * Отображает текущий баланс пользователя, процентное изменение за период и
 * сглаженный график (d3-shape curveMonotoneX) истории баланса.
 * ---
 * ### Особенности:
 * - Стилистика: Glassmorphism (использует GlassCard)
 * - График использует SVG linearGradient и mask-image для создания эффекта свечения и плавного появления.
 * - История масштабируется автоматически (min/max).
 */
import { formatAmount } from "~/utils";

defineProps<{
  amount: number;
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

      <!-- Загруженное состояние: Текст баланса -->
      <div v-else class="fade-in">
        <p class="text-base mb-1 text-text-secondary">
          <template v-if="amount < 0"> Вы превысили бюджет на </template>
          <template v-else> Остаток бюджета до {{ lastDayOfMonth }} </template>
        </p>
        <h2
          class="text-4xl font-extrabold tracking-tight"
          :class="amount < 0 ? 'text-text-accent' : 'text-text-primary'"
        >
          {{ formatAmount(Math.abs(amount)) }}
        </h2>

        <p
          v-if="amount > 0"
          class="text-xs mt-2 tracking-wide flex items-center gap-1 text-text-secondary"
        >
          Можно тратить ~ {{ formatAmount(dailyGuideline) }} / день
        </p>
      </div>
    </div>
  </GlassCard>
</template>
