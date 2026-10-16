<script setup lang="ts">
/**
 * @module app/pages/subscription
 * @fileoverview Экран управления регулярными ежемесячными платежами
 * @description
 * Отображает список регулярных платежей пользователя, сводку ежемесячных трат,
 * позволяет создавать, редактировать и удалять платежи со свайпом.
 */
import { ref, onMounted } from "vue";
import { CalendarClock } from "@lucide/vue";
import { formatAmount, getPluralSub } from "~/utils/format";
import { Z_INDEX } from "~/utils/zIndex";
import type { Subscription } from "~/composables/useSubscriptions";

const {
  subscriptions,
  isLoading,
  error,
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

const confirmDelete = (sub: Subscription) => {
  deletingSubscription.value = sub;
  isDeleteModalOpen.value = true;
};

const cancelDelete = () => {
  isDeleteModalOpen.value = false;
  deletingSubscription.value = null;
};

const handleDelete = async () => {
  if (!deletingSubscription.value) return false;
  const res = await deleteSubscription(deletingSubscription.value.id);
  return Boolean(res && res.success);
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <PageHeader
      title="Регулярные платежи"
      subtitle="Ежемесячные подписки и счета"
      back-to="/settings"
      back-aria-label="Назад к настройкам"
      :show-action="Boolean(subscriptions.length)"
      action-aria-label="Добавить регулярный платёж"
      @action="openCreateForm"
    />

    <!-- Сводная карточка -->
    <GlassCard class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <span class="text-text-secondary text-sm"> Всего в месяц </span>
        <CalendarClock class="size-5 text-text-secondary" />
      </div>
      <div
        v-if="isLoading && subscriptions.length === 0"
        class="flex items-baseline gap-2 py-1 animate-pulse"
      >
        <Skeleton class="w-32 h-8" rounded="lg" />
        <Skeleton class="w-20 h-4" rounded="md" />
      </div>
      <div v-else class="flex items-baseline gap-1">
        <span class="text-3xl font-bold text-text-primary tracking-tight">
          {{ formatAmount(totalMonthly) }}
        </span>
        <span class="text-sm text-text-secondary font-medium">
          / {{ subscriptions.length }}
          {{ getPluralSub(subscriptions.length) }}
        </span>
      </div>
    </GlassCard>

    <!-- Список платежей -->
    <div class="flex flex-col">
      <!-- Скелетон загрузки -->
      <div
        v-if="isLoading && subscriptions.length === 0"
        class="flex flex-col gap-2"
      >
        <GlassCard
          v-for="i in 3"
          :key="i"
          class="flex items-center justify-between px-4 py-3 animate-pulse"
        >
          <div class="flex items-center gap-3 w-full">
            <Skeleton class="size-9" rounded="full" />
            <div class="flex flex-col gap-1.5 w-1/2">
              <Skeleton class="h-5 w-3/4" />
              <Skeleton class="h-3 w-30" />
            </div>
          </div>
          <Skeleton class="w-20 h-5" />
        </GlassCard>
      </div>

      <!-- Ошибка загрузки -->
      <GlassErrorState
        v-else-if="error && subscriptions.length === 0"
        title="Не удалось загрузить регулярные платежи"
        :error="error"
        @retry="fetchSubscriptions(true)"
      />

      <!-- Пустое состояние -->
      <div
        v-else-if="subscriptions.length === 0"
        class="mt-1 flex flex-col gap-2 items-center text-center"
      >
        <span class="text-4xl"> 📅 </span>
        <div class="flex flex-col gap-px">
          <span class="text-text-primary font-bold text-base">
            Нет регулярных платежей
          </span>
          <span class="text-text-secondary text-xs">
            Добавьте подписки, аренду или кредит, чтобы бот напоминал о них
            заранее
          </span>
        </div>
        <GlassButton
          variant="soft"
          size="sm"
          class="mt-2 text-xs px-5"
          @click="openCreateForm"
        >
          Добавить первый платёж
        </GlassButton>
      </div>

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

      <!-- Модалка удаления регулярного платежа -->
      <ConfirmDeleteModal
        :is-open="isDeleteModalOpen"
        position="center"
        title="Удаление платежа"
        :description="`Вы уверены, что хотите удалить регулярный платёж «${deletingSubscription?.name}»?`"
        confirm-text="🧨 Сжечь"
        :z-index="Z_INDEX.SUBSCRIPTION_DELETE"
        :on-confirm="handleDelete"
        @close="cancelDelete"
      />
    </div>
  </div>
</template>
