<script setup lang="ts">
/**
 * @module app/components/split/ExportShareModal
 * @fileoverview Модальное окно внесения доли расхода в личные финансы
 * @description
 * Позволяет отредактировать название траты, выбрать категорию и зафиксировать долю
 * из совместного расхода в качестве личной транзакции.
 * ---
 * ### Логика работы:
 * 1. Загрузка списка категорий расходов пользователя через `useCategories`.
 * 2. Редактирование названия траты через `GlassInput` (предзаполнено названием из сплита).
 * 3. Выбор категории для новой транзакции с помощью `GlassCategorySelect`.
 * 4. Отправка запроса на экспорт через `exportShareToTransaction` из `useSplit`.
 * 5. Оповещение об успешном экспорте событием `exported` и закрытие модалки.
 */
import { ref, onMounted, computed, watch } from "vue";
import { RussianRuble } from "@lucide/vue";
import type { SplitExpense } from "~/types/split";
import { formatAmount } from "~/utils/format";

const props = defineProps<{
  isOpen: boolean;
  groupId: string;
  expense: SplitExpense | null;
  userShareAmount: number;
}>();

const emit = defineEmits<{
  (e: "close" | "exported"): void;
}>();

const { exportShareToTransaction } = useSplit();
const { categories, isLoading: pending, fetchCategories } = useCategories();

const expenseTitle = ref("");
const selectedCategoryId = ref("");
const buttonState = ref<"idle" | "loading" | "success">("idle");

onMounted(() => {
  fetchCategories();
});

watch(
  () => [props.isOpen, props.expense] as const,
  ([open, exp]) => {
    if (open) {
      buttonState.value = "idle";
      expenseTitle.value = exp?.title || "";
      selectedCategoryId.value = "";
    }
  },
  { immediate: true },
);

const expenseCategories = computed(() =>
  categories.value
    .filter((c) => c.type === "expense")
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || "💸",
    })),
);

const handleExport = async () => {
  if (
    !props.expense ||
    !selectedCategoryId.value ||
    !expenseTitle.value.trim() ||
    buttonState.value === "loading"
  )
    return;

  buttonState.value = "loading";
  try {
    const success = await exportShareToTransaction(
      props.groupId,
      props.expense.id,
      selectedCategoryId.value,
      expenseTitle.value,
    );

    if (success) {
      buttonState.value = "success";
      setTimeout(() => {
        emit("exported");
        emit("close");
      }, 500);
    } else {
      buttonState.value = "idle";
    }
  } catch {
    buttonState.value = "idle";
  }
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    title="Внести в свои расходы"
    position="bottom"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <GlassInput
        v-model="expenseTitle"
        label="Название траты"
        placeholder="Например, Обед или Такси"
      />
      <div class="flex flex-col gap-1.5">
        <GlassCategorySelect
          v-model="selectedCategoryId"
          :categories="expenseCategories"
          :disabled="pending"
          label="В какую категорию добавить"
          :placeholder="
            pending ? 'Загрузка категорий...' : 'Выберите категорию'
          "
        />
      </div>
      <div class="px-5 flex items-center justify-between text-sm">
        <span class="text-text-primary">Ваша доля:</span>
        <span class="text-base font-bold text-text-accent">
          {{ formatAmount(userShareAmount) }}
        </span>
      </div>

      <div class="flex items-center justify-end gap-2 pt-px">
        <GlassButton
          size="sm"
          type="button"
          variant="soft"
          class="px-6.5"
          @click="emit('close')"
        >
          Отмена
        </GlassButton>
        <GlassMorphButton
          type="submit"
          size="sm"
          :state="buttonState"
          :disabled="!selectedCategoryId || !expenseTitle.trim()"
          @click="handleExport"
        >
          <span class="text-base">Добавить в траты</span>
          <template #success>
            <RussianRuble :stroke-width="2" />
          </template>
        </GlassMorphButton>
      </div>
    </div>
  </GlassModal>
</template>
