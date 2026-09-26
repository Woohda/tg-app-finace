<script setup lang="ts">
/**
 * @module app/pages/categories
 * @fileoverview Экран управления категориями транзакций
 * @description
 * Отображает списки доходов и расходов. Позволяет добавлять новые категории
 * через модальное окно и удалять существующие (если нет связанных транзакций).
 * ---
 * ### Логика работы:
 * 1. Получение списков категорий с бэкенда через `useCategories`.
 * 2. Отрисовка двух секций: расходы и доходы.
 * 3. Открытие модальных окон для создания, редактирования и удаления категорий.
 */
import { ref, computed, onMounted } from "vue";
import { ChevronLeft, Plus } from "@lucide/vue";

const { categories, fetchCategories, isLoading } = useCategories();

onMounted(() => {
  fetchCategories();
});

const expenses = computed(() =>
  categories.value.filter((c) => c.type === "expense"),
);
const incomes = computed(() =>
  categories.value.filter((c) => c.type === "income"),
);

const sections = computed(() => [
  {
    title: "Категории трат",
    items: expenses.value,
    defaultIcon: "💸",
  },
  {
    title: "Категории доходов",
    items: incomes.value,
    defaultIcon: "💰",
  },
]);

// Состояние формы (Добавление / Редактирование)
const isFormOpen = ref(false);
const isEditMode = ref(false);
const editingId = ref<string | null>(null);
const initialName = ref("");
const initialIcon = ref("");
const initialType = ref<"expense" | "income">("expense");

const openCreateForm = (type: "expense" | "income" = "expense") => {
  isEditMode.value = false;
  editingId.value = null;
  initialName.value = "";
  initialIcon.value = "";
  initialType.value = type;
  isFormOpen.value = true;
};

const openEditForm = (category: (typeof categories.value)[0]) => {
  isEditMode.value = true;
  editingId.value = category.id;
  initialName.value = category.name;
  initialIcon.value = category.icon || "";
  initialType.value = category.type as "expense" | "income";
  isFormOpen.value = true;
};

const closeForm = () => {
  isFormOpen.value = false;
};

// Состояние модалки удаления
const isDeleteModalOpen = ref(false);
const deletingCategoryId = ref<string | null>(null);

const confirmDelete = (id: string) => {
  deletingCategoryId.value = id;
  isDeleteModalOpen.value = true;
};

const cancelDelete = () => {
  isDeleteModalOpen.value = false;
  deletingCategoryId.value = null;
};
</script>

<template>
  <div class="flex flex-col gap-5 relative">
    <!-- Header -->
    <div class="flex items-center justify-center gap-3 relative">
      <NuxtLink
        class="w-12 h-12 absolute left-0 top-1/2 -translate-y-1/2 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 active:scale-95 transition-transform a11y-focus"
        to="/settings"
        aria-label="Назад к настройкам"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </NuxtLink>
      <GlassButton
        variant="soft"
        size="icon"
        class="px-2 absolute right-0 top-1/2 -translate-y-1/2"
        aria-label="Добавить категорию"
        @click="openCreateForm('expense')"
      >
        <Plus class="text-text-primary" :stroke-width="1.5" />
      </GlassButton>

      <div class="flex flex-col text-center">
        <h1 class="text-text-primary text-xl font-bold tracking-tight">
          Мои категории
        </h1>
        <p class="text-text-secondary text-xs">Управление списком категорий</p>
      </div>
    </div>

    <!-- Списки категорий -->
    <div
      v-for="section in sections"
      :key="section.title"
      class="flex flex-col gap-2"
    >
      <h2 class="text-text-primary font-bold">{{ section.title }}</h2>
      <GlassCard class="px-2 py-0.5 flex flex-col">
        <template v-if="isLoading && categories.length === 0">
          <div
            v-for="i in 3"
            :key="i"
            class="flex items-center justify-between px-3 py-2 border-b border-black/6 last:border-none animate-pulse"
          >
            <div class="flex items-center gap-3 w-full">
              <Skeleton class="size-9" rounded="rounded-full" />
              <Skeleton class="h-4 w-1/2" />
            </div>
            <div class="flex items-center gap-5 ml-2">
              <Skeleton class="size-5" />
              <Skeleton class="size-5" />
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-if="section.items.length === 0"
            class="p-4 text-center text-text-secondary text-sm"
          >
            У вас нет добавленных категорий
          </div>
          <CategoryItem
            v-for="cat in section.items"
            :key="cat.id"
            :name="cat.name"
            :icon="cat.icon || undefined"
            :default-icon="section.defaultIcon"
            @edit="openEditForm(cat)"
            @delete="confirmDelete(cat.id)"
          />
        </template>
      </GlassCard>
    </div>

    <!-- Модалка формы -->
    <CategoryFormModal
      :is-open="isFormOpen"
      :is-edit-mode="isEditMode"
      :category-id="editingId"
      :initial-name="initialName"
      :initial-icon="initialIcon"
      :initial-type="initialType"
      @close="closeForm"
    />

    <!-- Модалка удаления -->
    <CategoryDeleteModal
      :is-open="isDeleteModalOpen"
      :category-id="deletingCategoryId"
      @close="cancelDelete"
    />
  </div>
</template>
