<script setup lang="ts">
import { computed } from "vue";
import { Calendar } from "@lucide/vue";
import GlassModal from "~/components/modal/GlassModal.vue";
import GlassInput from "~/components/shared/GlassInput.vue";
import GlassCategorySelect from "~/components/shared/GlassCategorySelect.vue";
import GlassButton from "~/components/shared/GlassButton.vue";
import type { Database } from "~/types/database.types";

type Category = Database["public"]["Tables"]["categories"]["Row"];
interface ScannedTransaction {
  id?: string;
  type: "expense" | "income";
  amount: number;
  description: string;
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
      <!-- Переключатель типа транзакции (чтобы можно было поменять, если ИИ ошибся) -->
      <div class="flex gap-2 p-1 bg-surface-primary/10 rounded-xl">
        <button
          class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
          :class="
            localItem.type === 'expense'
              ? 'bg-text-primary text-bg-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          "
          @click="localItem.type = 'expense'"
        >
          Расход
        </button>
        <button
          class="flex-1 py-2 text-sm font-medium rounded-lg transition-colors"
          :class="
            localItem.type === 'income'
              ? 'bg-text-accent text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          "
          @click="localItem.type = 'income'"
        >
          Доход
        </button>
      </div>

      <GlassInput
        v-model="localItem.description"
        type="text"
        placeholder="Название покупки / Комментарий"
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
          class="max-w-35"
        />
        <GlassInput
          v-model="localItem.amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          icon="₽"
          class="flex-1 w-full"
        />
      </div>

      <GlassButton variant="primary" class="w-full py-4 mt-2" @click="save">
        Сохранить изменения
      </GlassButton>
    </div>
  </GlassModal>
</template>
