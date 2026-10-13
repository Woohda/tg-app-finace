<script setup lang="ts">
/**
 * @module app/components/split/BalancesList
 * @fileoverview Список балансов участников группы совместных трат
 * @description
 * Отображает финансовое состояние каждого участника: итоговый нетто-баланс,
 * фактически оплаченную сумму и суммарную стоимость потребленных долей.
 * ---
 * ### Логика работы:
 * 1. Получение массива `balances` из входных параметров `props`.
 * 2. Отрисовка карточек с цветовой дифференциацией (зеленый для кредиторов, красный для должников).
 * 3. Выделение профиля текущего пользователя меткой `(Вы)`.
 */
import type { SplitMemberBalance } from "~/types/split";

defineProps<{
  balances: SplitMemberBalance[];
}>();
</script>

<template>
  <GlassCard class="p-4 pb-2 flex flex-col gap-2">
    <div
      v-for="b in balances"
      :key="b.memberId"
      class="flex items-center justify-between gap-3 pb-2 border-b border-black/5 last:border-none"
    >
      <div class="flex flex-col gap-px items-start min-w-0 flex-1">
        <div class="flex items-center gap-1 min-w-0 max-w-full">
          <span
            class="text-text-primary font-bold text-sm truncate"
            :title="b.memberName"
          >
            {{ b.memberName }}
          </span>
          <span
            v-if="b.isCurrentUser"
            class="text-text-accent font-semibold text-xs shrink-0"
          >
            (Вы)
          </span>
        </div>
        <div
          class="flex flex-wrap items-center gap-x-1 text-text-secondary text-[10px] max-w-full leading-tight"
        >
          <span v-if="b.totalPaid > 0" class="whitespace-nowrap">
            Оплатил {{ formatAmount(b.totalPaid) }}
          </span>
          <span
            v-if="b.totalPaid > 0"
            class="text-text-secondary select-none"
            aria-hidden="true"
          >
            •
          </span>
          <span class="whitespace-nowrap">
            Доля {{ formatAmount(b.totalOwed) }}
          </span>
        </div>
      </div>

      <div class="text-right shrink-0">
        <span
          v-if="b.netBalance > 0.01"
          class="text-xs font-bold text-text-success bg-text-success/5 px-2 py-1 rounded-full"
        >
          +{{ formatAmount(b.netBalance) }}
        </span>
        <span
          v-else-if="b.netBalance < -0.01"
          class="text-xs font-bold text-text-accent bg-accent-start/5 px-2 py-1 rounded-full"
        >
          -{{ formatAmount(Math.abs(b.netBalance)) }}
        </span>
        <span v-else class="text-xs font-medium text-text-secondary">
          0 ₽ (в расчете)
        </span>
      </div>
    </div>
  </GlassCard>
</template>
