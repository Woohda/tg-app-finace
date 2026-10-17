<script setup lang="ts">
/**
 * @module app/components/split/GroupCard
 * @fileoverview Карточка группы совместных трат в стиле купона/билета (Glassmorphism Ticket)
 * @description
 * Отображает группу совместных расходов в виде стилизованного билета с боковыми вырезами (нотчами),
 * перфорированной линией отрыва, градиентной органической капсулой иконки,
 * суммарными тратами и личным балансом.
 * ---
 * ### Логика работы:
 * 1. Получение объекта группы `SplitGroupSummary` из входных параметров.
 * 2. Отрисовка названия, количества участников (с правильным склонением) и общих расходов.
 * 3. Цветовая дифференциация личного баланса (зеленый / винный / нейтральный).
 * 4. Навигация на детальную страницу `/split/:id` по клику на карточку.
 */
import { UserGroup, Tickets } from "@lucide/vue";
import type { SplitGroupSummary } from "~/types/split";
import { formatAmount } from "~/utils/format";

defineProps<{
  group: SplitGroupSummary;
}>();
</script>

<template>
  <NuxtLink
    :to="`/split/${group.id}`"
    class="block a11y-focus rounded-3xl focus-visible:outline-offset-4 group/card select-none"
  >
    <!-- Внешняя обертка с drop-shadow по контуру маски билета -->
    <div
      class="ticket-wrapper transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
    >
      <div
        class="ticket-card relative glass-pill flex items-stretch overflow-hidden rounded-[26px]"
      >
        <!-- Левая и центральная часть билета (основной контент) -->
        <div
          class="flex-1 min-w-0 pl-6 pr-3.5 py-3.5 flex flex-col justify-between gap-2.5"
        >
          <!-- Верхний ряд: органическая капсула с иконкой + название и траты -->
          <div class="flex items-center gap-2.5 min-w-0">
            <!-- Градиентная органическая капсула с иконкой группы -->
            <div
              class="ticket-icon-badge size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_8px_rgba(244,63,94,0.08)] glass-pill"
            >
              <UserGroup class="size-7 text-text-primary" :stroke-width="1.5" />
            </div>

            <!-- Название группы и количество участников / общие траты -->
            <div class="flex flex-col items-start min-w-0 flex-1">
              <h2
                class="text-text-primary font-bold text-[15px] leading-snug truncate w-full"
                :title="group.name"
              >
                {{ group.name }}
              </h2>
              <div
                class="flex items-center gap-1.5 text-text-secondary text-xs mt-0.5 truncate w-full"
              >
                <span>
                  {{ group.membersCount }}
                  уч.
                </span>
                <span class="opacity-40">•</span>
                <span class="font-medium text-text-primary/80">
                  {{ formatAmount(group.totalExpenses) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Нижний ряд: персональный баланс (сохранено расположение) -->
          <div
            class="flex items-center justify-between text-xs gap-2 pt-1 border-t border-black/5"
          >
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
            <span
              v-else
              class="font-medium text-text-secondary whitespace-nowrap"
            >
              Все расчеты закрыты
            </span>
          </div>
        </div>

        <!-- Перфорированная вертикальная линия отрыва -->
        <div
          class="w-px relative my-2 border-r border-dashed border-text-secondary/50 shrink-0"
        />

        <!-- Правый корешок билета (stub) с pill-кнопкой перехода -->
        <div
          class="w-18 shrink-0 flex items-center justify-center pl-2.25 pr-5"
        >
          <Tickets class="size-6.5 text-text-accent" :stroke-width="1.5" />
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
/* Тень обертки, плавно огибающая силуэт билета с вырезами */
.ticket-wrapper {
  filter: drop-shadow(0 8px 24px rgba(130, 115, 105, 0.1))
    drop-shadow(0 1px 1px rgba(255, 255, 255, 0.9));
}

/* Мягкая пастельная градиентная подложка для капсулы иконки */
.ticket-icon-badge {
  background: linear-gradient(
    135deg,
    rgba(254, 226, 226, 0.9) 0%,
    rgba(255, 237, 213, 0.75) 50%,
    rgba(243, 232, 255, 0.65) 100%
  );
}

/* Сквозные фигурные вырезы билета (нотчи) */
.ticket-card {
  -webkit-mask-image:
    radial-gradient(circle 12px at 0% 50%, transparent 11.5px, #000 12px),
    radial-gradient(circle 12px at 100% 50%, transparent 11.5px, #000 12px),
    radial-gradient(
      circle 8px at calc(100% - 74px) 0%,
      transparent 6.5px,
      #000 7px
    ),
    radial-gradient(
      circle 7px at calc(100% - 74px) 100%,
      transparent 6.5px,
      #000 7px
    );
  -webkit-mask-composite: source-in, source-in, source-in;
  mask-image:
    radial-gradient(circle 12px at 0% 50%, transparent 11.5px, #000 12px),
    radial-gradient(circle 12px at 100% 50%, transparent 11.5px, #000 12px),
    radial-gradient(
      circle 7px at calc(100% - 73.5px) 0%,
      transparent 6.5px,
      #000 7px
    ),
    radial-gradient(
      circle 7px at calc(100% - 73.5px) 100%,
      transparent 6.5px,
      #000 7px
    );
  mask-composite: intersect;
}
</style>
