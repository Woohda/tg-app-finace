<script setup lang="ts">
/**
 * @module app/components/split/GroupSummaryCard
 * @fileoverview Сводная hero-карточка группы совместных трат
 * @description
 * Отображает ключевые показатели группы в стиле Glassmorphism:
 * - Круглая стеклянная плашка с акцентной коралловой иконкой группы;
 * - Название группы и интерактивный счетчик участников;
 * - Горизонтальный стек аватаров участников с бейджем оставшихся (+N) и кнопкой быстрого добавления;
 * - Две плашки балансов в ряд («Общий» расход и «Ваш баланс» с цветовой дифференциацией);
 * - Кнопки действий: отправка напоминаний должникам (с 24ч cooldown) и копирование отчёта.
 * ---
 * ### Логика работы:
 * 1. Прием детального объекта группы `SplitGroupDetail` и состояний загрузки/копирования.
 * 2. Вычисление отображаемых участников (первые 5) и количества оставшихся (+N).
 * 3. Расчет тайм-аута cooldown (24 часа) для защиты от спам-уведомлений.
 * 4. Отправка событий `openMembers`, `addMember`, `notify` и `copyReport`.
 */
import { computed } from "vue";
import { Bell, Check, Copy, UserPlus } from "@lucide/vue";
import type { SplitGroupDetail } from "~/types/split";
import { formatAmount, pluralize, getAmountTextSize } from "~/utils/format";

const props = withDefaults(
  defineProps<{
    group: SplitGroupDetail;
    isNotifying?: boolean;
    isCopied?: boolean;
    currentAuthAvatarUrl?: string | null;
  }>(),
  {
    isNotifying: false,
    isCopied: false,
    currentAuthAvatarUrl: null,
  },
);

const emit = defineEmits<{
  (e: "openMembers" | "addMember" | "notify" | "copyReport"): void;
}>();

const visibleMembers = computed(() => {
  return props.group.members.slice(0, 5);
});

const remainingMembersCount = computed(() => {
  return Math.max(0, props.group.members.length - 5);
});

const isNotifiedRecently = computed(() => {
  const last = props.group.last_notified_at;
  if (!last) return false;
  const time = new Date(last).getTime();
  if (isNaN(time)) return false;
  return Date.now() - time < 24 * 60 * 60 * 1000;
});

const remainingCooldownHours = computed(() => {
  const last = props.group.last_notified_at;
  if (!last) return 0;
  const time = new Date(last).getTime();
  if (isNaN(time)) return 0;
  const elapsed = Date.now() - time;
  const cooldown = 24 * 60 * 60 * 1000;
  if (elapsed >= cooldown) return 0;
  return Math.ceil((cooldown - elapsed) / (60 * 60 * 1000));
});

const notifyButtonTooltip = computed(() => {
  if (isNotifiedRecently.value) {
    return remainingCooldownHours.value > 0
      ? `Напоминание уже отправлено за сегодня (повтор через ${remainingCooldownHours.value} ч.)`
      : "Напоминание уже отправлено за сегодня";
  }
  return "Отправить напоминание должникам в Telegram";
});

const amountsTextSize = computed(() => {
  return getAmountTextSize([
    props.group.totalGroupSpending,
    props.group.userNetBalance,
  ]);
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Верхняя часть: круглая иконка + название + участники + аватары -->
    <div class="flex items-center gap-2.5">
      <!-- Круглая стеклянная плашка с градиентной иконкой группы -->
      <div
        class="-mt-2 size-24 rounded-full glass-pill flex items-center justify-center shrink-0"
      >
        <GroupIcon class="size-18" />
      </div>

      <!-- Заголовок, количество участников и стек аватарок -->
      <div class="mt-1 flex flex-col min-w-0 flex-1 justify-center">
        <h1
          class="text-2xl font-bold text-text-primary tracking-wide truncate"
          :title="group.name"
        >
          {{ group.name }}
        </h1>

        <button
          type="button"
          class="text-xs text-text-secondary hover:text-text-primary transition-colors text-left w-fit cursor-pointer select-none a11y-focus"
          title="Открыть список участников"
          @click="emit('openMembers')"
        >
          {{ group.members.length }}
          {{
            pluralize(group.members.length, [
              "участник",
              "участника",
              "участников",
            ])
          }}
        </button>

        <!-- Стек аватаров участников -->
        <div class="flex items-center">
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
              size="xs"
              class="size-10 glass-pill bg-white/50 backdrop-blur-xl"
            />

            <!-- Бейдж оставшихся участников (+N) -->
            <div
              v-if="remainingMembersCount > 0"
              class="size-10 rounded-full flex items-center justify-center font-bold text-xs text-text-secondary/70 glass-pill bg-white/50 backdrop-blur-xl select-none"
            >
              +{{ remainingMembersCount }}
            </div>
          </div>

          <!-- Кнопка быстрого добавления участника -->
          <GlassButton
            size="sm"
            type="button"
            variant="soft"
            class="h-auto ml-0.5 p-2.5"
            title="Добавить участника"
            aria-label="Добавить участника"
            @click="emit('addMember')"
          >
            <UserPlus class="size-6 text-text-accent" :stroke-width="2" />
          </GlassButton>
        </div>
      </div>
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

    <!-- Кнопки действий: Напомнить и Отчет -->
    <div class="flex items-center gap-1.5 pt-0.5 w-full">
      <GlassButton
        variant="soft"
        class="h-auto flex-1 min-w-0 py-1.5 px-3.5 flex items-center justify-center gap-1.5 text-xs font-medium"
        :class="isNotifiedRecently && 'disabled:opacity-75'"
        :disabled="isNotifying || isNotifiedRecently"
        :title="notifyButtonTooltip"
        @click="emit('notify')"
      >
        <component
          :is="isNotifiedRecently ? Check : Bell"
          class="size-3.5 shrink-0"
          :class="
            isNotifiedRecently ? 'text-accent-success' : 'text-text-accent'
          "
          :stroke-width="isNotifiedRecently ? 2 : 1.5"
        />
        <span class="truncate">{{
          isNotifying
            ? "Сообщаю..."
            : isNotifiedRecently
              ? "Уже напомнили сегодня"
              : "Напомнить о долгах"
        }}</span>
      </GlassButton>

      <GlassButton
        variant="soft"
        class="h-auto py-1.5 px-3.5 flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap"
        @click="emit('copyReport')"
      >
        <component
          :is="isCopied ? Check : Copy"
          class="size-3.5 shrink-0"
          :class="isCopied ? 'text-accent-success' : 'text-text-accent'"
          :stroke-width="1.5"
        />
        <span>{{ isCopied ? "Скопировано!" : "Скопировать отчет" }}</span>
      </GlassButton>
    </div>
  </div>
</template>
