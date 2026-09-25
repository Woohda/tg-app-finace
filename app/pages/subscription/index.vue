<script setup lang="ts">
/**
 * @module app/pages/subscription
 * @fileoverview Экран управления регулярными ежемесячными платежами
 * @description
 * Отображает список регулярных платежей пользователя, сводку ежемесячных трат,
 * позволяет создавать, редактировать и удалять платежи со свайпом.
 */
import { ref, onMounted } from "vue";
import { ChevronLeft, Plus, CalendarClock } from "@lucide/vue";
import { formatAmount } from "~/utils";
import {
  useSubscriptions,
  type Subscription,
} from "~/composables/useSubscriptions";

const {
  subscriptions,
  pending,
  fetchSubscriptions,
  deleteSubscription,
  totalMonthly,
  upcomingSubscriptions,
} = useSubscriptions();

onMounted(() => {
  fetchSubscriptions();
});

// Модалка формы (создание/редактирование)
const isFormOpen = ref(false);
const isEditMode = ref(false);
const editingSubscription = ref<Subscription | null>(null);

const openCreateForm = () => {
  isEditMode.value = false;
  editingSubscription.value = null;
  isFormOpen.value = true;
};

const openEditForm = (sub: Subscription) => {
  isEditMode.value = true;
  editingSubscription.value = sub;
  isFormOpen.value = true;
};

const closeForm = () => {
  isFormOpen.value = false;
  editingSubscription.value = null;
};

// Модалка удаления
const isDeleteModalOpen = ref(false);
const deletingSubscription = ref<Subscription | null>(null);
const isDeleting = ref(false);

const confirmDelete = (sub: Subscription) => {
  deletingSubscription.value = sub;
  isDeleteModalOpen.value = true;
};

const cancelDelete = () => {
  isDeleteModalOpen.value = false;
  deletingSubscription.value = null;
};

const handleDelete = async () => {
  if (!deletingSubscription.value) return;
  isDeleting.value = true;
  await deleteSubscription(deletingSubscription.value.id);
  isDeleting.value = false;
  isDeleteModalOpen.value = false;
  deletingSubscription.value = null;
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-end justify-center gap-3 relative">
      <NuxtLink
        class="w-12 h-12 absolute left-0 top-1/2 -translate-y-1/2 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 active:scale-95 transition-transform a11y-focus"
        to="/settings"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </NuxtLink>

      <GlassButton
        variant="soft"
        size="icon"
        class="px-2 absolute right-0 top-1/2 -translate-y-1/2"
        @click="openCreateForm"
      >
        <Plus class="text-text-primary" :stroke-width="1.5" />
      </GlassButton>

      <div class="flex flex-col text-center w-74">
        <h1 class="text-text-primary text-xl font-bold tracking-tight">
          Регулярные платежи
        </h1>
        <p class="text-text-secondary text-xs">Ежемесячные подписки и счета</p>
      </div>
    </div>

    <!-- Сводная карточка -->
    <GlassCard class="p-5 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-text-secondary text-xs"> Всего в месяц </span>
        <CalendarClock class="size-4 text-text-secondary" />
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-black text-text-primary tracking-tight">
          {{ formatAmount(totalMonthly) }}
        </span>
        <span class="text-xs text-text-secondary font-medium">
          / {{ subscriptions.length }}
          {{ subscriptions.length === 1 ? "платёж" : "платежей" }}
        </span>
      </div>
    </GlassCard>

    <!-- Список платежей -->
    <div class="flex flex-col">
      <!-- Скелетон загрузки -->
      <div
        v-if="pending && subscriptions.length === 0"
        class="flex flex-col gap-2"
      >
        <GlassCard
          v-for="i in 3"
          :key="i"
          class="flex items-center justify-between px-4 py-3 animate-pulse"
        >
          <div class="flex items-center gap-3 w-full">
            <Skeleton class="size-9" rounded="rounded-full" />
            <div class="flex flex-col gap-1.5 w-1/2">
              <Skeleton class="h-5 w-3/4" />
              <Skeleton class="h-3 w-30" />
            </div>
          </div>
          <Skeleton class="w-20 h-5" />
        </GlassCard>
      </div>

      <!-- Пустое состояние -->
      <GlassCard
        v-else-if="subscriptions.length === 0"
        class="text-center flex flex-col items-center"
      >
        <div
          class="rounded-full glass-inner flex items-center justify-center text-4xl"
        >
          📅
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-text-primary font-bold text-base">
            Нет регулярных платежей
          </span>
          <span class="text-text-secondary text-xs max-w-xs">
            Добавьте подписки, аренду или кредит, чтобы бот напоминал о них
            заранее
          </span>
        </div>
        <GlassButton
          variant="primary"
          class="mt-1 gap-px"
          @click="openCreateForm"
        >
          <Plus :stroke-width="2" />
          <span>Добавить первый платёж</span>
        </GlassButton>
      </GlassCard>

      <!-- Список платежей -->
      <div v-else class="flex flex-col gap-2">
        <SubscriptionItem
          v-for="sub in upcomingSubscriptions"
          :key="sub.id"
          :subscription="sub"
          @edit="openEditForm(sub)"
          @delete="confirmDelete(sub)"
        />
      </div>

      <!-- Модалка формы (Создание / Редактирование) -->
      <SubscriptionFormModal
        :is-open="isFormOpen"
        :is-edit-mode="isEditMode"
        :subscription="editingSubscription"
        @close="closeForm"
      />

      <!-- Модалка удаления -->
      <GlassModal
        :is-open="isDeleteModalOpen"
        position="center"
        title="Удалить платёж?"
        @close="cancelDelete"
      >
        <div class="flex flex-col gap-4 text-center">
          <p class="text-sm text-text-secondary">
            Вы уверены, что хотите удалить регулярный платёж
            <strong class="text-text-primary font-bold">
              «{{ deletingSubscription?.name }}» </strong
            >?
          </p>

          <div class="flex gap-3">
            <GlassButton
              type="button"
              variant="soft"
              class="flex-1"
              :disabled="isDeleting"
              @click="cancelDelete"
            >
              Отмена
            </GlassButton>
            <GlassMorphButton
              variant="delete"
              :disabled="isDeleting"
              @click="handleDelete"
            >
              <span>🧨 Сжечь</span>
              <template #success>
                <Flame :stroke-width="1.5" />
              </template>
            </GlassMorphButton>
          </div>
        </div>
      </GlassModal>
    </div>
  </div>
</template>
