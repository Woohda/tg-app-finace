<script setup lang="ts">
/**
 * @module app/components/split/GroupCard
 * @fileoverview Карточка группы совместных трат в общем списке
 * @description
 * Отображает название группы, количество участников, общие расходы и личный баланс.
 * Предоставляет ссылку перехода к детальной странице группы `/split/:id`.
 * ---
 * ### Логика работы:
 * 1. Получение объекта `group` типа `SplitGroupSummary` из `props`.
 * 2. Отрисовка названия, суммарных трат и бейджа персонального баланса.
 * 3. Навигация на страницу группы по клику.
 */
import { Users, ChevronRight } from "@lucide/vue";
import type { SplitGroupSummary } from "~/types/split";

defineProps<{
  group: SplitGroupSummary;
}>();
</script>

<template>
  <NuxtLink
    :to="`/split/${group.id}`"
    class="block a11y-focus rounded-3xl focus-visible:outline-offset-4"
  >
    <GlassCard
      class="p-4 flex flex-col gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="size-12 rounded-full glass-pill flex items-center justify-center text-text-primary shrink-0"
          >
            <span class="text-[27px]">👥</span>
          </div>
          <div class="flex flex-col items-start">
            <h2 class="text-text-primary font-bold text-base line-clamp-1">
              {{ group.name }}
            </h2>
            <div class="flex items-center gap-2 text-text-secondary text-xs">
              <span class="flex items-center gap-1">
                <Users class="size-3.5" />
                {{ group.membersCount }} уч.
              </span>
              <span>•</span>
              <span>{{ formatAmount(group.totalExpenses) }}</span>
            </div>
          </div>
        </div>

        <ChevronRight class="size-5 text-text-secondary opacity-60" />
      </div>

      <!-- Бейдж личного баланса -->
      <div class="flex items-center justify-between text-xs gap-2">
        <span class="text-text-secondary shrink-0">Ваш баланс:</span>
        <span
          v-if="group.userNetBalance > 0.01"
          class="font-semibold text-accent-success whitespace-nowrap tabular-nums"
        >
          Вам должны {{ formatAmount(group.userNetBalance) }}
        </span>
        <span
          v-else-if="group.userNetBalance < -0.01"
          class="font-semibold text-text-accent whitespace-nowrap tabular-nums"
        >
          Вы должны {{ formatAmount(Math.abs(group.userNetBalance)) }}
        </span>
        <span v-else class="font-medium text-text-secondary whitespace-nowrap">
          Все расчеты закрыты
        </span>
      </div>
    </GlassCard>
  </NuxtLink>
</template>
