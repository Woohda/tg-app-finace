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
import { computed } from "vue";
import { Calendar } from "@lucide/vue";
import type { Database } from "~/types/database.types";

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

watch(
  () => props.item,
  (newItem) => {
    if (newItem) {
      localItem.value = { ...newItem };
    } else {
      localItem.value = null;
    }
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
    emit("save", localItem.value);
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

      <div class="flex gap-3">
        <GlassInput
          v-model="localItem.date"
          type="date"
          :icon="Calendar"
          class="min-w-0 pr-px"
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

      <GlassMorphButton variant="primary" @click="save">
        Сохранить изменения
      </GlassMorphButton>
    </div>
  </GlassModal>
</template>
