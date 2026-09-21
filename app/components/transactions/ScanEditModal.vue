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
import { Calendar } from "@lucide/vue";
import type { Database } from "~/types/database.types";
import { transactionFrontendSchema } from "~/types/validate";
import { formatZodError } from "~/utils/zod";

type Category = Database["public"]["Tables"]["categories"]["Row"];
interface ScannedTransaction {
  id?: string;
  type: "expense" | "income";
  amount: number;
  name: string;
  suggestedCategory?: string;
  categoryId?: string;
  date?: string;
}

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

const save = () => {
  if (localItem.value) {
    const result = transactionFrontendSchema.safeParse({
      amount: Number(localItem.value.amount),
      categoryId: localItem.value.categoryId || "",
      date: localItem.value.date || "",
      type: localItem.value.type,
      name: localItem.value.name,
    });

    if (!result.success) {
      formError.value = formatZodError(result.error);
      return;
    }

    formError.value = null;
    emit("save", {
      ...localItem.value,
      amount: Number(localItem.value.amount),
    });
  }
};
</script>

<template>
  <GlassModal
    title="Редактирование"
    :is-open="isOpen"
    position="bottom"
    :show-close="true"
    @close="emit('close')"
  >
    <div v-if="localItem" class="flex flex-col gap-3 px-2">
      <GlassInput
        v-model="localItem.name"
        type="text"
        placeholder="Название покупки"
      />

      <GlassCategorySelect
        v-model="localItem.categoryId"
        :categories="filteredCategories"
      />

      <div class="w-full flex gap-3">
        <GlassInput
          v-model="localItem.date"
          type="date"
          :icon="Calendar"
          class="max-w-45 pr-px"
        />
        <GlassInput
          v-model="localItem.amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          icon="₽"
          class="min-w-0"
        />
      </div>

      <GlassTypeSelector v-model="localItem.type" />

      <div v-if="formError" class="text-text-accent text-sm text-center">
        {{ formError }}
      </div>

      <GlassMorphButton variant="primary" @click="save">
        Сохранить изменения
      </GlassMorphButton>
    </div>
  </GlassModal>
</template>
