<script setup lang="ts">
/**
 * @module app/components/dashboard/SubscriptionDashboardCard
 * @fileoverview Виджет регулярных ежемесячных платежей для главного дашборда
 * @description
 * Отображает общую сумму обязательных регулярных платежей в текущем месяце и
 * список ближайших списаний со статусами срочности (Сегодня, Завтра, Через N дней).
 * При клике на платёж открывает модалку его редактирования.
 * Предоставляет быстрый переход к экрану управления регулярными платежами.
 */
import { ref, onMounted } from "vue";
import { CalendarClock, ChevronRight, Plus } from "@lucide/vue";
import { formatAmount } from "~/utils/format";
import type { Subscription } from "~/composables/useSubscriptions";

const {
  subscriptions,
  pending,
  fetchSubscriptions,
  totalMonthly,
  upcomingSubscriptions,
} = useSubscriptions();

onMounted(() => {
  fetchSubscriptions();
});

// Модалка редактирования регулярного платежа
const isEditModalOpen = ref(false);
const editingSubscription = ref<Subscription | null>(null);

function openEditModal(sub: Subscription) {
  editingSubscription.value = sub;
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingSubscription.value = null;
}

function getPluralSub(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return "платежей";
  if (mod10 === 1) return "платёж";
  if (mod10 >= 2 && mod10 <= 4) return "платежа";
  return "платежей";
}
</script>

<template>
  <GlassCard>
    <!-- Шапка карточки -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2.5">
        <div
          class="size-8 rounded-xl glass-inner flex items-center justify-center text-text-accent shrink-0 glass-pill"
        >
          <CalendarClock class="size-4" :stroke-width="2" />
        </div>
        <h2 class="text-lg font-extrabold text-text-primary">
          Регулярные платежи
        </h2>
      </div>

      <NuxtLink
        to="/subscription"
        class="text-xs font-bold text-text-secondary hover:text-text-primary flex items-center gap-0.5 transition-colors a11y-focus rounded px-1.5 py-1"
      >
        <span class="text-sm">Все</span>
        <ChevronRight class="size-4 mt-px" :stroke-width="2" />
      </NuxtLink>
    </div>

    <!-- Состояние 1: Загрузка первичных данных -->
    <div
      v-if="pending && subscriptions.length === 0"
      class="flex flex-col gap-2 mt-2"
    >
      <div class="flex justify-between items-center py-1">
        <Skeleton class="w-32 h-3.5 rounded" />
        <Skeleton class="w-20 h-4 rounded" />
      </div>
      <Skeleton class="w-full h-13 rounded-2xl" />
      <Skeleton class="w-full h-13 rounded-2xl" />
    </div>

    <!-- Состояние 2: Подписок нет -->
    <div
      v-else-if="subscriptions.length === 0"
      class="flex flex-col items-center justify-center text-center py-3 px-2 mt-1"
    >
      <p class="text-xs text-text-secondary max-w-65 leading-relaxed">
        Добавьте подписки и обязательные счета — бот напомнит перед списанием
      </p>
      <NuxtLink
        to="/subscription"
        class="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-text-primary px-3.5 py-1.5 rounded-full glass-milky border-[0.5px] border-white/60 active:scale-95 transition-transform"
      >
        <Plus class="size-3.5" :stroke-width="2" />
        <span>Настроить платежи</span>
      </NuxtLink>
    </div>

    <!-- Состояние 3: Список регулярных платежей -->
    <div v-else class="flex flex-col gap-2.5 mt-2">
      <!-- Сводка суммы в месяц -->
      <div class="flex items-baseline justify-between px-1">
        <span class="text-xs text-text-secondary font-medium">
          Всего в этом месяце:
        </span>
        <span class="text-base font-extrabold text-text-primary">
          {{ formatAmount(totalMonthly) }}
        </span>
      </div>

      <!-- Список ближайших 3 платежей -->
      <div class="flex flex-col gap-2">
        <button
          v-for="item in upcomingSubscriptions.slice(0, 5)"
          :key="item.id"
          type="button"
          class="w-full text-left flex items-center justify-between gap-5 glass-pill py-2 px-3 rounded-full active:scale-[0.99] transition-transform a11y-focus cursor-pointer"
          @click="openEditModal(item)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <!-- Иконка категории / эмодзи -->
            <div
              class="size-9 rounded-full flex items-center justify-center text-sm shrink-0 glass-pill"
            >
              {{ item.categoryIcon || "💸" }}
            </div>

            <!-- Название и статус-бейдж -->
            <div class="flex flex-col min-w-0">
              <span
                class="text-xs font-bold text-text-primary truncate max-w-32.5"
              >
                {{ item.name }}
              </span>
              <div class="flex items-center gap-1 mt-0.5">
                <span
                  v-if="item.statusType === 'today'"
                  class="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-accent-start/15 text-accent-mid"
                >
                  Сегодня
                </span>
                <span
                  v-else-if="item.statusType === 'soon'"
                  class="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-accent-notification text-text-primary"
                >
                  {{ item.statusLabel }}
                </span>
                <span
                  v-else
                  class="text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-black/5 text-text-secondary"
                >
                  {{ item.day_of_month }}-го числа
                </span>
              </div>
            </div>
          </div>

          <!-- Сумма -->
          <div class="text-sm font-extrabold text-text-primary shrink-0 pl-2">
            {{ formatAmount(item.amount) }}
          </div>
        </button>
      </div>

      <!-- Ссылка "Ещё N платежей", если их больше 3 -->
      <NuxtLink
        v-if="subscriptions.length > 3"
        to="/subscription"
        class="text-center text-[11px] font-semibold text-text-secondary hover:text-text-primary pt-0.5 a11y-focus rounded"
      >
        Ещё {{ subscriptions.length - 3 }}
        {{ getPluralSub(subscriptions.length - 3) }}
      </NuxtLink>
    </div>

    <!-- Модалка редактирования регулярного платежа -->
    <SubscriptionFormModal
      :is-open="isEditModalOpen"
      :is-edit-mode="true"
      :subscription="editingSubscription"
      @close="closeEditModal"
    />
  </GlassCard>
</template>
