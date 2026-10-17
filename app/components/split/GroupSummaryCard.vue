<script setup lang="ts">
/**
 * @module app/components/split/GroupSummaryCard
 * @fileoverview Сводная hero-карточка группы совместных трат
 * @description
 * Отображает ключевые показатели группы в стиле Glassmorphism:
 * - Горизонтальный стек аватаров участников с бейджем оставшихся (+N) и кнопкой быстрого добавления;
 * - Две плашки балансов в ряд («Всего потрачено» и «Ваш баланс» с цветовой дифференциацией).
 * ---
 * ### Логика работы:
 * 1. Прием детального объекта группы `SplitGroupDetail` и аватара текущего пользователя.
 * 2. Вычисление отображаемых участников (первые 6) и количества оставшихся (+N).
 * 3. Отправка событий `openMembers` и `addMember`.
 */
import { computed } from "vue";
import { UserPlus } from "@lucide/vue";
import type { SplitGroupDetail } from "~/types/split";
import { formatAmount, getAmountTextSize } from "~/utils/format";

const props = withDefaults(
  defineProps<{
    group: SplitGroupDetail;
    currentAuthAvatarUrl?: string | null;
  }>(),
  {
    currentAuthAvatarUrl: null,
  },
);

const emit = defineEmits<{
  (e: "openMembers" | "addMember"): void;
}>();

const visibleMembers = computed(() => {
  return props.group.members.slice(0, 6);
});

const remainingMembersCount = computed(() => {
  return Math.max(0, props.group.members.length - 6);
});

const amountsTextSize = computed(() => {
  return getAmountTextSize([
    props.group.totalGroupSpending,
    props.group.userNetBalance,
  ]);
});
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <!-- Стек аватаров участников -->
    <div class="flex items-center justify-center">
      <div
        class="flex items-center -space-x-3 cursor-pointer a11y-focus rounded-full"
        role="button"
        tabindex="0"
        title="Участники группы"
        aria-label="Участники группы"
        @click="emit('openMembers')"
        @keydown.enter="emit('openMembers')"
        @keydown.space.prevent="emit('openMembers')"
      >
        <Avatar
          v-for="m in visibleMembers"
          :key="m.id"
          :src="
            m.photo_url || (m.is_current_user ? currentAuthAvatarUrl : null)
          "
          :name="m.name"
          size="sm"
          class="size-9.5 glass-pill bg-white/50 backdrop-blur-sm"
        />

        <!-- Бейдж оставшихся участников (+N) -->
        <div
          v-if="remainingMembersCount > 0"
          class="size-9.5 rounded-full flex items-center justify-center font-bold text-xs text-text-secondary/70 glass-pill bg-white/50 backdrop-blur-xl select-none"
        >
          +{{ remainingMembersCount }}
        </div>
      </div>

      <!-- Кнопка быстрого добавления участника -->
      <GlassButton
        size="sm"
        type="button"
        variant="soft"
        class="h-auto ml-0.5 px-4.5 py-1.75 flex gap-1 text-text-accent text-sm"
        title="Добавить участника"
        aria-label="Добавить участника"
        @click="emit('addMember')"
      >
        <UserPlus class="size-4.5" :stroke-width="2" />
        <span>Добавить</span>
      </GlassButton>
    </div>

    <!-- Две плашки балансов в ряд -->
    <div class="grid grid-cols-2 gap-2.5 mt-1">
      <!-- Общий расход группы -->
      <GlassCard class="flex-1 p-4 flex flex-col justify-center gap-1">
        <span
          class="text-text-secondary text-xs font-bold uppercase tracking-wider"
          >Всего потрачено</span
        >
        <span
          class="font-bold text-text-primary tabular-nums mt-0.5 whitespace-nowrap"
          :class="amountsTextSize"
        >
          {{ formatAmount(group.totalGroupSpending) }}
        </span>
      </GlassCard>

      <!-- Персональный баланс пользователя -->
      <GlassCard class="flex-1 p-4 flex flex-col justify-center gap-1">
        <span
          class="text-text-secondary text-xs font-bold uppercase tracking-wider"
          >Ваш баланс</span
        >
        <span
          v-if="group.userNetBalance > 0.01"
          class="font-bold text-accent-success tabular-nums mt-0.5 whitespace-nowrap"
          :class="amountsTextSize"
        >
          +{{ formatAmount(group.userNetBalance) }}
        </span>
        <span
          v-else-if="group.userNetBalance < -0.01"
          class="font-bold text-text-accent tabular-nums mt-0.5 whitespace-nowrap"
          :class="amountsTextSize"
        >
          -{{ formatAmount(Math.abs(group.userNetBalance)) }}
        </span>
        <span
          v-else
          class="font-bold text-text-primary tabular-nums mt-0.5 whitespace-nowrap"
          :class="amountsTextSize"
        >
          0&nbsp;₽
        </span>
      </GlassCard>
    </div>
  </div>
</template>
