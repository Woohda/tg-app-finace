<script setup lang="ts">
/**
 * @module app/components/modal/ScanEditModal
 * @fileoverview Вспомогательное окно для редактирования отсканированных позиций из чека.
 * @description
 * Позволяет пользователю проверить и откорректировать данные конкретной товарной позиции,
 * полученной от AI-парсера, перед массовым сохранением в БД.
 * ---
 * ### Логика работы:
 * 1. Принимает `item` (ScannedTransaction) через props.
 * 2. Позволяет изменить сумму, категорию и название (описание).
 * 3. Возвращает измененный объект через событие `save`.
 */
import { computed, ref, watch } from "vue";
import { RussianRuble } from "@lucide/vue";
import type { Category } from "~/composables/useCategories";
import type { ScannedTransaction } from "~/composables/useTransactionModal";
import {
  validateTransactionForm,
  isTransactionFormValid,
  getAmountInputError,
  getNameInputError,
} from "~/utils/validation";

const props = defineProps<{
  isOpen: boolean;
  item: ScannedTransaction | null;
  categories: Category[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", item: ScannedTransaction): void;
}>();

const localItem = ref<ScannedTransaction | null>(null);
const formError = ref<string | null>(null);

watch(
  () => props.item,
  (newItem) => {
    if (newItem) {
      localItem.value = { ...newItem };
    } else {
      localItem.value = null;
    }
    formError.value = null;
  },
  { immediate: true },
);

// Фильтруем категории в зависимости от типа транзакции
const filteredCategories = computed(() => {
  if (!localItem.value) return [];
  return props.categories.filter((c) => c.type === localItem.value!.type);
});

const isFormValid = computed(() => {
  if (!localItem.value) return false;
  return isTransactionFormValid(localItem.value.amount, localItem.value.name);
});

const isSubmitDisabled = computed(() => {
  return !isFormValid.value;
});

watch(
  () => [
    localItem.value?.amount,
    localItem.value?.categoryId,
    localItem.value?.name,
  ],
  () => {
    if (formError.value) {
      formError.value = null;
    }
  },
);

const displayError = computed(() => {
  if (!localItem.value) return null;
  const amountErr = getAmountInputError(localItem.value.amount);
  if (amountErr) return amountErr;

  const nameErr = getNameInputError(localItem.value.name);
  if (nameErr) return nameErr;

  return formError.value;
});

const save = () => {
  if (!localItem.value || !isFormValid.value) return;

  const result = validateTransactionForm({
    amount: localItem.value.amount,
    categoryId: localItem.value.categoryId,
    date: localItem.value.date,
    type: localItem.value.type,
    name: localItem.value.name,
  });

  if (!result.success) {
    formError.value = result.error;
    return;
  }

  formError.value = null;
  emit("save", {
    ...localItem.value,
    name: result.data.name || localItem.value.name,
    amount: result.data.amount,
  });
};
</script>

<template>
  <GlassModal
    title="Редактирование"
    :is-open="isOpen"
    position="bottom"
    :show-close="true"
    :z-index="Z_INDEX.SCAN_EDIT"
    @close="emit('close')"
  >
    <form
      v-if="localItem"
      class="flex flex-col gap-3 px-2"
      @submit.prevent="save"
    >
      <GlassInput
        v-model="localItem.name"
        type="text"
        label="Название транзакции"
        placeholder="Название транзакции"
        autocapitalize="sentences"
        @blur="localItem.name = capitalizeFirstLetter(localItem.name) || ''"
      />

      <GlassCategorySelect
        v-model="localItem.categoryId"
        label="Категория"
        :categories="filteredCategories"
      />

      <div class="w-full flex gap-3">
        <GlassDatePicker
          v-model="localItem.date"
          label="Дата"
          date-format="numeric"
          class="max-w-37"
        />
        <GlassInput
          v-model="localItem.amount"
          type="text"
          inputmode="decimal"
          step="0.01"
          label="Сумма"
          placeholder="0.00"
          :icon="RussianRuble"
        />
      </div>

      <GlassTypeSelector v-model="localItem.type" />

      <div v-if="displayError" class="text-text-accent text-xs text-center">
        {{ displayError }}
      </div>

      <GlassMorphButton
        type="submit"
        variant="primary"
        :disabled="isSubmitDisabled"
      >
        <span>Сохранить изменения</span>
      </GlassMorphButton>
    </form>
  </GlassModal>
</template>
