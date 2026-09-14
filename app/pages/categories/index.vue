<script setup lang="ts">
/**
 * @module app/pages/categories
 * @fileoverview Экран управления категориями транзакций
 * @description
 * Отображает списки доходов и расходов. Позволяет добавлять новые категории
 * через модальное окно и удалять существующие (если нет связанных транзакций).
 */
import { ref, computed, onMounted, watch } from "vue";
import {
  ChevronLeft,
  Flame,
  Plus,
  Pencil,
  SquarePen,
  Trash2,
} from "@lucide/vue";
import { categorySchema } from "~/types/validate";
import { formatZodError } from "~/utils/zod";

const {
  categories,
  error,
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
const formError = ref<string | null>(null);
const formButtonState = ref<"idle" | "loading" | "success">("idle");

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
  formError.value = null;
  formButtonState.value = "idle";
  isFormOpen.value = true;
};

const openEditForm = (category: (typeof categories.value)[0]) => {
  isEditMode.value = true;
  editingId.value = category.id;
  formName.value = category.name;
  formIcon.value = category.icon || "";
  formType.value = category.type as "expense" | "income";
  formError.value = null;
  formButtonState.value = "idle";
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

  const existingCategory = categories.value.find(
    (c) => c.name.toLowerCase() === result.data.name.toLowerCase(),
  );

  if (existingCategory) {
    if (!isEditMode.value || existingCategory.id !== editingId.value) {
      formError.value = "Категория с таким именем уже существует";
      return;
    }
  }

  formError.value = null;
  formButtonState.value = "loading";

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

  if (success) {
    formButtonState.value = "success";
    setTimeout(() => {
      closeForm();
      formButtonState.value = "idle";
    }, 1200);
  } else {
    formButtonState.value = "idle";
    formError.value = error.value || "Произошла ошибка";
  }
};

const isDeleteModalOpen = ref(false);
const deletingCategoryId = ref<string | null>(null);
const deleteButtonState = ref<"idle" | "loading" | "success">("idle");

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
  deleteButtonState.value = "idle";
};

const executeDelete = async () => {
  if (!deletingCategoryId.value) return;

  deleteButtonState.value = "loading";
  const success = await deleteCategory(deletingCategoryId.value);

  if (success) {
    deleteButtonState.value = "success";
    setTimeout(() => {
      isDeleteModalOpen.value = false;
      deletingCategoryId.value = null;
      deleteButtonState.value = "idle";
    }, 1200);
  } else {
    deleteButtonState.value = "idle";
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
        class="px-2.25 absolute right-0 top-1/2 -translate-y-1/2"
        @click="openCreateForm('expense')"
      >
        <Plus class="text-text-primary" :stroke-width="1.5" />
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

    <!-- Модалка формы -->
    <GlassModal
      :is-open="isFormOpen"
      :title="isEditMode ? 'Редактировать' : 'Новая категория'"
      position="bottom"
      @close="closeForm"
    >
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

        <GlassMorphButton
          type="submit"
          variant="primary"
          class="mt-2"
          :state="formButtonState"
        >
          <span>{{
            isEditMode ? "💾 Сохранить изменения" : "✨ Создать"
          }}</span>
          <template v-if="!isEditMode" #success>
            <SquarePen class="w-7 h-7" :stroke-width="1.5" />
          </template>
        </GlassMorphButton>
      </form>
    </GlassModal>

    <!-- Модалка удаления -->
    <GlassModal
      :is-open="isDeleteModalOpen"
      :show-close="false"
      position="center"
      @close="cancelDelete"
    >
      <div class="flex flex-col gap-2 text-center">
        <h2 class="text-text-primary text-xl font-bold">
          {{ error ? "Удаление невозможно" : "Удалить категорию?" }}
        </h2>
        <p class="text-text-secondary text-sm">
          {{ error ? error : "Вы уверены, что хотите удалить эту категорию?" }}
        </p>
      </div>

      <div class="flex gap-3 mt-2">
        <GlassButton variant="soft" class="flex-1" @click="cancelDelete">
          {{ error ? "Ок" : "Отмена" }}
        </GlassButton>
        <div v-if="!error" class="flex-1 flex justify-center">
          <GlassMorphButton
            variant="delete"
            :state="deleteButtonState"
            @click="executeDelete"
          >
            <span>🧨 Сжечь</span>
            <template #success>
              <Flame class="w-7 h-7" :stroke-width="1.5" />
            </template>
          </GlassMorphButton>
        </div>
      </div>
    </GlassModal>
  </div>
</template>
