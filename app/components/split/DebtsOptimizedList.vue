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
 * 4. Адаптивное распределение доступной ширины строк (защита коротких имен и "Мне"/"Я" от обрезания).
 */
import { ArrowRight, Send, TicketCheck } from "@lucide/vue";
import type { SplitDebtTransfer } from "~/types/split";

const props = defineProps<{
  transfers: SplitDebtTransfer[];
  currentMemberId?: string;
}>();

const emit = defineEmits<{
  (e: "settle", transfer: SplitDebtTransfer): void;
}>();

const isFromMe = (t: SplitDebtTransfer): boolean => {
  return Boolean(
    (props.currentMemberId && t.fromMemberId === props.currentMemberId) ||
    t.fromMemberName.trim().toLowerCase() === "я",
  );
};

const isToMe = (t: SplitDebtTransfer): boolean => {
  return Boolean(
    (props.currentMemberId && t.toMemberId === props.currentMemberId) ||
    t.toMemberName.trim().toLowerCase() === "я",
  );
};

const getFromMemberName = (t: SplitDebtTransfer): string => {
  return isFromMe(t) ? "Я" : t.fromMemberName;
};

const getToMemberName = (t: SplitDebtTransfer): string => {
  return isToMe(t) ? "Мне" : t.toMemberName;
};

/**
 * Проверяет, является ли имя коротким (не требует агрессивного сжатия)
 */
const isShortName = (name: string): boolean => name.trim().length <= 5;

/**
 * Вычисляет адаптивный класс ширины для имени отправителя
 */
const getFromNameClass = (t: SplitDebtTransfer): string => {
  const fromName = getFromMemberName(t);
  const toName = getToMemberName(t);
  const fromShort = isShortName(fromName);
  const toShort = isShortName(toName);

  if (fromShort) {
    return "shrink-0";
  }
  if (!toShort) {
    // Оба длинные: делят доступную ширину поровну
    return "truncate min-w-0 max-w-[calc(50%-10px)]";
  }
  // Отправитель длинный, получатель короткий: обрезается только при нехватке места без растягивания
  return "truncate min-w-0";
};

/**
 * Вычисляет адаптивный класс ширины для имени получателя
 */
const getToNameClass = (t: SplitDebtTransfer): string => {
  const fromName = getFromMemberName(t);
  const toName = getToMemberName(t);
  const fromShort = isShortName(fromName);
  const toShort = isShortName(toName);

  if (toShort) {
    return "shrink-0";
  }
  if (!fromShort) {
    // Оба длинные: делят доступную ширину поровну
    return "truncate min-w-0 max-w-[calc(50%-10px)]";
  }
  // Получатель длинный, отправитель короткий
  return "truncate min-w-0";
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
          class="flex flex-col px-3.5 py-2.5"
        >
          <div class="flex items-center justify-between gap-1.5">
            <Avatar :name="t.fromMemberName" size="md" />
            <!-- От кого и Кому -->
            <div
              class="flex flex-col text-[13px] sm:text-sm font-semibold text-text-primary min-w-0 flex-1"
            >
              <div class="flex items-center gap-1 shrink-0 text-left">
                <div class="flex items-center gap-0.5">
                  <span
                    class="text-text-accent"
                    :class="getFromNameClass(t)"
                    :title="getFromMemberName(t)"
                  >
                    {{ getFromMemberName(t) }}
                  </span>
                  <span
                    v-if="t.fromTelegramId"
                    class="text-[10px] bg-sky-500/50 text-white font-semibold p-0.75 rounded-full"
                    title="Получит уведомление в Telegram"
                  >
                    <Send class="size-2" :stroke-width="1.5" />
                  </span>
                </div>

                <ArrowRight class="size-3 text-text-secondary/60 shrink-0" />
                <span
                  class="text-accent-success"
                  :class="getToNameClass(t)"
                  :title="getToMemberName(t)"
                >
                  {{ getToMemberName(t) }}
                </span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0 justify-end">
                <span
                  class="text-[13px] sm:text-sm font-bold tracking-tight text-text-primary tabular-nums whitespace-nowrap"
                >
                  {{ formatAmount(t.amount) }}
                </span>
              </div>
            </div>

            <GlassButton
              variant="soft"
              class="h-auto py-1.5 px-2 flex items-center justify-center shrink-0 text-xs"
              title="Зафиксировать расчет"
              @click="emit('settle', t)"
            >
              <TicketCheck
                class="size-4 text-text-accent"
                :stroke-width="1.5"
              />
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  </div>
</template>
