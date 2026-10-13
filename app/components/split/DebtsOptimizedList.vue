<script setup lang="ts">
/**
 * @module app/components/split/DebtsOptimizedList
 * @fileoverview Оптимизированный расчет переводов между должниками и кредиторами
 * @description
 * Отображает минимальный список необходимых переводов для полного погашения долгов
 * (алгоритм Min Cash Flow) и позволяет инициировать фиксацию расчета переводом.
 * ---
 * ### Логика работы:
 * 1. Получение массива оптимизированных переводов `transfers` из входных параметров.
 * 2. Отрисовка пустого состояния при отсутствии задолженностей.
 * 3. Инициация фиксации расчета переводом через событие `settle`.
 */
import { ArrowRight, HandCoins } from "@lucide/vue";
import type { SplitDebtTransfer } from "~/types/split";

const props = defineProps<{
  transfers: SplitDebtTransfer[];
  currentMemberId?: string;
}>();

const emit = defineEmits<{
  (e: "settle", transfer: SplitDebtTransfer): void;
}>();

const getFromMemberName = (t: SplitDebtTransfer): string => {
  const isMe =
    (props.currentMemberId && t.fromMemberId === props.currentMemberId) ||
    t.fromMemberName.trim().toLowerCase() === "я";
  return isMe ? "Я" : t.fromMemberName;
};

const getToMemberName = (t: SplitDebtTransfer): string => {
  const isMe =
    (props.currentMemberId && t.toMemberId === props.currentMemberId) ||
    t.toMemberName.trim().toLowerCase() === "я";
  return isMe ? "Мне" : t.toMemberName;
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Если все долги закрыты -->
    <div
      v-if="transfers.length === 0"
      class="flex flex-col items-center justify-center gap-1 text-center"
    >
      <span class="text-3xl">🎉</span>
      <h3 class="text-text-primary font-bold text-base">
        Все расчеты закрыты!
      </h3>
      <p class="text-text-secondary text-xs">
        В этой группе никто никому ничего не должен.
      </p>
    </div>

    <!-- Список оптимизированных переводов -->
    <div v-else class="flex flex-col gap-2">
      <div class="flex flex-col gap-2">
        <GlassCard
          v-for="(t, idx) in transfers"
          :key="idx"
          class="flex flex-col py-2.5"
        >
          <div class="flex items-center justify-between gap-2">
            <!-- От кого и Кому -->
            <div
              class="flex items-center gap-1.5 text-[15px] font-bold text-text-primary min-w-0 flex-1"
            >
              <span class="text-text-accent truncate min-w-0 max-w-25">{{
                getFromMemberName(t)
              }}</span>
              <ArrowRight class="size-3.5 text-text-secondary shrink-0" />
              <span class="text-accent-success truncate min-w-0">{{
                getToMemberName(t)
              }}</span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Индикатор Telegram бота, если пользователь зарегистрирован в FINO -->
              <span
                v-if="t.fromTelegramId"
                class="text-[10px] bg-sky-500/10 text-sky-500 font-semibold px-2 py-0.5 rounded-full"
                title="Получит уведомление в Telegram"
              >
                Telegram
              </span>

              <span class="text-sm font-bold text-text-primary">
                {{ formatAmount(t.amount) }}
              </span>
              <GlassButton
                variant="soft"
                class="h-auto py-1.5 px-3 flex gap-1 text-xs"
                @click="emit('settle', t)"
              >
                <HandCoins
                  class="size-3.5 text-text-accent"
                  :stroke-width="1.5"
                />
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
</template>
