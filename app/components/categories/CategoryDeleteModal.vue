<script setup lang="ts">
/**
 * @module app/components/categories/CategoryDeleteModal
 * @fileoverview Модальное окно для удаления категории
 * @description
 * Позволяет подтвердить или отменить удаление категории.
 * Выполняет проверку на наличие привязанных транзакций перед удалением.
 * ---
 * ### Логика работы:
 * 1. Проверка наличия транзакций при открытии окна.
 * 2. Блокировка кнопки удаления, если найдены связанные транзакции.
 * 3. Отправка запроса на удаление.
 */
import { ref, watch } from "vue";
import { Flame } from "@lucide/vue";

const props = defineProps<{
  isOpen: boolean;
  categoryId: string | null;
}>();

const emit = defineEmits(["close"]);

const { deleteCategory } = useCategories();
const { transactions } = useTransactions();

const errorMsg = ref<string | null>(null);
const deleteButtonState = ref<"idle" | "loading" | "success">("idle");

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && props.categoryId) {
      deleteButtonState.value = "idle";
      const hasTransactions = transactions.value.some(
        (t) => t.categoryId === props.categoryId,
      );
      if (hasTransactions) {
        errorMsg.value =
          "Невозможно удалить категорию, так как с ней связаны транзакции. Сначала удалите их или перенесите в другую категорию.";
      } else {
        errorMsg.value = null;
      }
    }
  },
);

const cancelDelete = () => {
  emit("close");
};

const executeDelete = async () => {
  if (!props.categoryId) return;

  deleteButtonState.value = "loading";
  const success = await deleteCategory(props.categoryId);

  if (success) {
    deleteButtonState.value = "success";
    setTimeout(() => {
      emit("close");
    }, 1200);
  } else {
    deleteButtonState.value = "idle";
  }
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    :show-close="false"
    position="center"
    @close="cancelDelete"
  >
    <div class="flex flex-col gap-2 text-center">
      <h2 class="text-text-primary text-xl font-bold">
        {{ errorMsg ? "Удаление невозможно" : "Удалить категорию?" }}
      </h2>
      <p class="text-text-secondary text-sm">
        {{ errorMsg ? errorMsg : "Вы уверены, что хотите удалить эту категорию?" }}
      </p>
    </div>

    <div class="flex gap-3 mt-2">
      <GlassButton variant="soft" class="flex-1" @click="cancelDelete">
        {{ errorMsg ? "Ок" : "Отмена" }}
      </GlassButton>
      <div v-if="!errorMsg" class="flex-1 flex justify-center">
        <GlassMorphButton
          variant="delete"
          :state="deleteButtonState"
          @click="executeDelete"
        >
          <span>🧨 Сжечь</span>
          <template #success>
            <Flame :stroke-width="1.5" />
          </template>
        </GlassMorphButton>
      </div>
    </div>
  </GlassModal>
</template>
