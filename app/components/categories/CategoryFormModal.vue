<script setup lang="ts">
/**
 * @module app/components/categories/CategoryFormModal
 * @fileoverview Модальное окно для создания/редактирования категории
 * @description
 * Модальное окно, содержащее форму с валидацией (Zod). 
 * Позволяет создать новую категорию расходов/доходов или обновить существующую.
 * ---
 * ### Логика работы:
 * 1. Получение начальных данных через пропсы (если это редактирование).
 * 2. Валидация введенных данных (одно эмодзи, непустое имя).
 * 3. Отправка запроса на создание или обновление через глобальный composable.
 */
import { ref, watch } from "vue";
import { SquarePen } from "@lucide/vue";
import { categorySchema } from "~/types/validate";
import { formatZodError } from "~/utils/zod";

const props = defineProps<{
  isOpen: boolean;
  isEditMode: boolean;
  categoryId?: string | null;
  initialName?: string;
  initialIcon?: string;
  initialType?: "expense" | "income";
}>();

const emit = defineEmits(["close"]);

const { categories, error, createCategory, updateCategory } = useCategories();

const formName = ref("");
const formIcon = ref("");
const formType = ref<"expense" | "income">("expense");
const formError = ref<string | null>(null);
const formButtonState = ref<"idle" | "loading" | "success">("idle");
const nameInputRef = ref<{ focus: () => void } | null>(null);

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      formName.value = props.initialName || "";
      formIcon.value = props.initialIcon || "";
      formType.value = props.initialType || "expense";
      formError.value = null;
      formButtonState.value = "idle";
      setTimeout(() => {
        nameInputRef.value?.focus();
      }, 100);
    }
  },
);

watch(formIcon, (newVal) => {
  if (newVal) {
    const glyphs = Array.from(newVal);
    if (glyphs.length > 1) {
      formIcon.value = glyphs[0] || "";
    }
  }
});

const closeForm = () => {
  emit("close");
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
    if (!props.isEditMode || existingCategory.id !== props.categoryId) {
      formError.value = "Категория с таким именем уже существует";
      return;
    }
  }

  formError.value = null;
  formButtonState.value = "loading";

  let success = false;
  if (props.isEditMode && props.categoryId) {
    success = await updateCategory(
      props.categoryId,
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
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    :title="isEditMode ? 'Редактировать' : 'Новая категория'"
    position="bottom"
    @close="closeForm"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submitForm">
      <div class="flex gap-3">
        <GlassInput
          ref="nameInputRef"
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
        :state="formButtonState"
      >
        <span>{{
          isEditMode ? "💾 Сохранить изменения" : "✨ Создать"
        }}</span>
        <template v-if="!isEditMode" #success>
          <SquarePen :stroke-width="1.5" />
        </template>
      </GlassMorphButton>
    </form>
  </GlassModal>
</template>
