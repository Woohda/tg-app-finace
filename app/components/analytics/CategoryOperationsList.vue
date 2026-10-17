<script setup lang="ts">
/**
 * @module app/components/analytics/CategoryOperationsList
 * @fileoverview Пагинированный список операций категории, оформленный как кассовый чек
 * @description
 * Отображает список транзакций категории в аутентичном стиле кассового чека:
 * - верхний штрихкод (ReceiptBarcode) и заголовок выборки/категории;
 * - общее количество операций и суммарный объем трат;
 * - верхний точечный разделитель (ReceiptDivider variant="dotted");
 * - скелетоны при загрузке или переключении периодов;
 * - позиции чека с отточиями (Dot Leaders), иконками и суммами (TransactionItem variant="receipt");
 * - нижняя перфорированная линия отрыва билета (ReceiptDivider variant="dashed") с боковыми вырезами (ReceiptCard);
 * - пагинация порциями по 10 элементов с автоматической подгрузкой через IntersectionObserver;
 * - подтверждение удаления транзакции через ConfirmDeleteModal.
 * ---
 * ### Логика работы:
 * 1. Получает отсортированный массив транзакций `transactions`, вычисляет суммарный объем.
 * 2. Ограничивает видимый срез `displayedTransactions` размером страницы `displayedLimit`.
 * 3. Отслеживает пересечение триггера внизу списка через `IntersectionObserver` и подгружает следующую порцию.
 * 4. Предоставляет свайп для удаления и открытие модального окна редактирования по тапу.
 */
import { ref, computed, toRef } from "vue";
import type { Transaction } from "~/composables/useTransactions";
import { formatAmount } from "~/utils/format";

interface Props {
  transactions: Transaction[];
  title: string;
  emptyText: string;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const isEffectiveLoading = computed(() => props.isLoading);

const { deleteTransaction } = useTransactions();
const { openModal } = useTransactionModal();

const {
  displayedTransactions,
  hasMoreTransactions,
  remainingCount,
  setLoadMoreTrigger,
  loadMore,
  filteredAmountText,
} = useOperationsPagination(toRef(props, "transactions"), {
  isPaused: isEffectiveLoading,
});

const deletingTransaction = ref<Transaction | null>(null);
const transactionDeleteError = ref<string | null>(null);

function confirmDelete(tx: Transaction) {
  deletingTransaction.value = tx;
  transactionDeleteError.value = null;
}

function cancelDelete() {
  deletingTransaction.value = null;
  transactionDeleteError.value = null;
}

async function handleDeleteTransaction() {
  if (!deletingTransaction.value) return false;
  const res = await deleteTransaction(deletingTransaction.value.id);
  if (!res.success) {
    transactionDeleteError.value = res.error || "Не удалось удалить операцию";
    return false;
  }
  return true;
}

function handleEdit(tx: Transaction) {
  openModal(tx);
}
</script>

<template>
  <ReceiptCard
    :title="title"
    :count="transactions.length"
    :amount-text="filteredAmountText"
    :has-more="hasMoreTransactions"
    :remaining-count="remainingCount"
    tooth-width="20px"
    notch-radius="12.5px"
    notch-height="12.5px"
    :on-trigger-mounted="setLoadMoreTrigger"
    class="relative z-10 w-full"
    @load-more="loadMore"
  >
    <!-- ТЕЛО ЧЕКА: СПИСОК ОПЕРАЦИЙ -->
    <div class="px-3">
      <!-- Скелетоны транзакций при загрузке -->
      <div v-if="isEffectiveLoading" class="flex flex-col gap-2 px-2 py-1">
        <TransactionsSkeletonList :count="3" mode="list" :show-icon="false" />
      </div>

      <!-- Список позиций в чеке -->
      <div v-else-if="displayedTransactions.length > 0" class="flex flex-col">
        <TransactionItem
          v-for="tx in displayedTransactions"
          :key="tx.id"
          v-memo="[
            tx.id,
            tx.amount,
            tx.name,
            tx.date,
            tx.type,
          ]"
          variant="receipt"
          :title="tx.name || tx.categoryName"
          :amount="tx.amount"
          :type="tx.type"
          :date="tx.date"
          interactive
          @click="handleEdit(tx)"
          @delete="confirmDelete(tx)"
        />
      </div>

      <!-- Пустое состояние при отсутствии трат -->
      <div
        v-else
        class="flex flex-col items-center justify-center text-center py-6 px-4 gap-2"
      >
        <p class="text-text-secondary text-sm font-medium">
          {{ emptyText }}
        </p>
      </div>
    </div>
  </ReceiptCard>

  <!-- Модалка удаления транзакции -->
  <ConfirmDeleteModal
    :is-open="Boolean(deletingTransaction)"
    title="Удаление транзакции"
    confirm-text="Удалить"
    position="center"
    :error="transactionDeleteError"
    :on-confirm="handleDeleteTransaction"
    @close="cancelDelete"
  >
    <p class="text-[17px] text-text-primary">
      <template v-if="deletingTransaction">
        Вы уверены, что хотите удалить транзакцию
        <strong class="text-text-accent font-semibold"
          >«{{
            deletingTransaction.name || deletingTransaction.categoryName
          }}»</strong
        >
        на сумму
        <strong class="text-text-primary">{{
          formatAmount(deletingTransaction.amount)
        }}</strong
        >?
      </template>
      <template v-else>
        Вы уверены, что хотите удалить эту транзакцию?
      </template>
    </p>
  </ConfirmDeleteModal>
</template>

<style scoped></style>
