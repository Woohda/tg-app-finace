<script setup lang="ts">
/**
 * @module app/pages/categories
 * @fileoverview Экран управления категориями транзакций
 * @description
 * Отображает списки доходов и расходов. Позволяет добавлять новые категории 
 * через модальное окно и удалять существующие (если нет связанных транзакций).
 */
import { ref, computed, onMounted, watch } from "vue";
import { ChevronLeft, Plus, Pencil, Trash2 } from "@lucide/vue";
import { categorySchema } from "~/types/validate";
import { formatZodError } from "~/utils/zod";

const {
  categories,
  error,
  isLoading,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = useCategories();

const { transactions } = useTransactions();

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

const formName = ref("");
const formIcon = ref("");
const formType = ref<"expense" | "income">("expense");
const formError = ref("");
const isSubmitting = ref(false);

// Оставляем только один эмодзи/символ при вводе
watch(formIcon, (newVal) => {
  if (newVal) {
    // Array.from правильно разбивает строку с учетом составных эмодзи
    const glyphs = Array.from(newVal);
    if (glyphs.length > 1) {
      formIcon.value = glyphs[0] || "";
    }
  }
});

const openCreateForm = (type: "expense" | "income" = "expense") => {
  isEditMode.value = false;
  editingId.value = null;
  formName.value = "";
  formIcon.value = "";
  formType.value = type;
  formError.value = "";
  isFormOpen.value = true;
};

const openEditForm = (category: (typeof categories.value)[0]) => {
  isEditMode.value = true;
  editingId.value = category.id;
  formName.value = category.name;
  formIcon.value = category.icon || "";
  formType.value = category.type as "expense" | "income";
  formError.value = "";
  isFormOpen.value = true;
};

const closeForm = () => {
  isFormOpen.value = false;
};

const submitForm = async () => {
  const result = categorySchema.safeParse({
    name: formName.value.trim(),
    icon: formIcon.value.trim(),
    type: formType.value,
  });

  if (!result.success) {
    formError.value = formatZodError(result.error);
    return;
  }

  isSubmitting.value = true;
  formError.value = "";

  let success = false;
  if (isEditMode.value && editingId.value) {
    success = await updateCategory(
      editingId.value,
      result.data.name,
      result.data.icon || "",
    );
  } else {
    const newCat = await createCategory(
      result.data.name,
      result.data.type,
      result.data.icon || "",
    );
    success = !!newCat;
  }

  isSubmitting.value = false;

  if (success) {
    closeForm();
  } else {
    formError.value = error.value || "Произошла ошибка";
  }
};

const isDeleteModalOpen = ref(false);
const deletingCategoryId = ref<string | null>(null);

const confirmDelete = (id: string) => {
  deletingCategoryId.value = id;
  const hasTransactions = transactions.value.some((t) => t.categoryId === id);
  if (hasTransactions) {
    error.value =
      "Невозможно удалить категорию, так как с ней связаны транзакции. Сначала удалите их или перенесите в другую категорию.";
  } else {
    error.value = null;
  }
  isDeleteModalOpen.value = true;
};

const cancelDelete = () => {
  isDeleteModalOpen.value = false;
  deletingCategoryId.value = null;
  error.value = null;
};

const executeDelete = async () => {
  if (!deletingCategoryId.value) return;
  const success = await deleteCategory(deletingCategoryId.value);
  if (success) {
    isDeleteModalOpen.value = false;
    deletingCategoryId.value = null;
  }
};
</script>

<template>
  <div class="flex flex-col gap-5 pb-5 relative">
    <!-- Header -->
    <div class="flex items-center justify-center gap-3 relative">
      <NuxtLink
        class="w-10 h-10 absolute left-0 top-1/2 -translate-y-1/2 rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 active:scale-95 transition-transform"
        to="/settings"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </NuxtLink>

      <div class="flex flex-col text-center">
        <h1 class="text-text-primary text-xl font-bold tracking-tight">
          Мои категории
        </h1>
        <p class="text-text-secondary text-xs">Управление списком</p>
      </div>

      <GlassButton
        variant="soft"
        size="sm"
        class="px-2.75 absolute right-0 top-1/2 -translate-y-1/2"
        @click="openCreateForm('expense')"
      >
        <Plus class="w-4 h-4 text-text-primary" />
      </GlassButton>
    </div>

    <!-- Списки категорий -->
    <div
      v-for="section in sections"
      :key="section.title"
      class="flex flex-col gap-2"
    >
      <h2 class="text-text-primary font-bold">{{ section.title }}</h2>
      <GlassCard class="px-2 py-0.5 flex flex-col">
        <template v-if="true && categories.length === 0">
          <div
            v-for="i in 3"
            :key="i"
            class="flex items-center justify-between px-3 py-2 border-b border-black/6 last:border-none animate-pulse"
          >
            <div class="flex items-center gap-3 w-full">
              <UiSkeleton class="size-9" rounded="rounded-full" />
              <UiSkeleton class="h-4 w-1/2" />
            </div>
            <div class="flex items-center gap-5 ml-2">
              <UiSkeleton class="size-5" />
              <UiSkeleton class="size-5" />
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
          <div
            v-for="cat in section.items"
            :key="cat.id"
            class="flex items-center justify-between px-3 py-2 transition-colors border-b border-black/6 last:border-none"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="size-9 rounded-full glass-milky flex items-center justify-center text-lg shrink-0"
              >
                {{ cat.icon || section.defaultIcon }}
              </div>
              <span
                class="w-full text-text-primary font-medium text-sm truncate"
                >{{ cat.name }}</span
              >
            </div>
            <div class="flex items-center gap-5 ml-2">
              <button
                class="text-text-secondary transition-colors"
                @click="openEditForm(cat)"
              >
                <Pencil class="size-5" />
              </button>
              <button
                class="text-text-accent transition-colors"
                @click="confirmDelete(cat.id)"
              >
                <Trash2 class="size-5" />
              </button>
            </div>
          </div>
        </template>
      </GlassCard>
    </div>

    <!-- Модалка формы (Overlays) -->
    <div
      v-if="isFormOpen"
      class="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="closeForm"
    >
      <GlassCard
        class="w-full max-w-95 px-6 flex flex-col gap-5 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 glass-milky"
      >
        <div class="flex justify-between items-center">
          <h2 class="text-text-primary text-xl font-bold">
            {{ isEditMode ? "Редактировать" : "Новая категория" }}
          </h2>
          <GlassButton
            variant="soft"
            size="sm"
            class="px-2.75 text-text-secondary text-2xl leading-none"
            @click="closeForm"
          >
            &times;
          </GlassButton>
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="submitForm">
          <div class="flex gap-3">
            <GlassInput
              v-model="formName"
              type="text"
              label="Название"
              placeholder="Например, Продукты"
              class="w-full"
            />
            <GlassInput
              v-model="formIcon"
              type="text"
              label="Эмодзи"
              placeholder="💸"
              maxlength="2"
              class="w-15 mr-2"
            />
          </div>

          <GlassTypeSelector v-if="!isEditMode" v-model="formType" />

          <div v-if="formError" class="text-text-accent text-sm text-center">
            {{ formError }}
          </div>

          <GlassButton
            type="submit"
            variant="primary"
            class="w-full mt-2"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? "Сохранение..." : "Сохранить" }}
          </GlassButton>
        </form>
      </GlassCard>
    </div>

    <!-- Модалка удаления -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="cancelDelete"
    >
      <GlassCard
        class="w-full max-w-95 p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200 glass-milky text-center"
      >
        <div class="flex flex-col gap-2">
          <h2 class="text-text-primary text-xl font-bold">
            {{ error ? "Удаление невозможно" : "Удалить категорию?" }}
          </h2>
          <p class="text-text-secondary text-sm">
            {{
              error ? error : "Вы уверены, что хотите удалить эту категорию?"
            }}
          </p>
        </div>

        <div class="flex gap-3 mt-2">
          <GlassButton variant="soft" class="flex-1" @click="cancelDelete">
            {{ error ? "Ок" : "Отмена" }}
          </GlassButton>
          <GlassButton
            v-if="!error"
            variant="primary"
            class="flex-1 bg-text-accent text-white"
            :disabled="isLoading"
            @click="executeDelete"
          >
            {{ isLoading ? "Удаление..." : "Удалить" }}
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
