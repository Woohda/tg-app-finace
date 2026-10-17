<script setup lang="ts">
/**
 * @module app/components/transactions/TransactionsOperationsList
 * @fileoverview Пагинированный список финансовых операций, оформленный как кассовый чек
 * @description
 * Отображает список операций раздела «Финансовый отчет» в аутентичном стиле кассового чека:
 * - верхний контрастный штрихкод (ReceiptBarcode) и метаданные чека (номер, статус, дата);
 * - общая сумма выборки и переключатель временного интервала (День, Неделя, Месяц);
 * - контекстная строка поиска с очисткой по названию и категории;
 * - позиции чека с отточиями (dot leaders), иконками категорий и суммами;
 * - нижняя перфорированная линия отрыва с боковыми вырезами билета (ReceiptCard);
 * - пагинация порциями по 10 элементов с автоматической подгрузкой через IntersectionObserver;
 * - подтверждение удаления операции через ConfirmDeleteModal.
 * ---
 * ### Логика работы:
 * 1. Форматирует номер чека на основе общего количества транзакций.
 * 2. Синхронизирует период `activePeriod` и поисковый запрос `searchQuery` с родителем.
 * 3. Ограничивает видимый срез `displayedTransactions` размером страницы `displayedLimit`.
 * 4. Автоматически подгружает следующую порцию при скролле к триггеру в футере чека.
 * 5. Предоставляет свайп для удаления и открытие модального окна редактирования по тапу.
 */
import { ref, computed, watch, toRef } from "vue";
import { Search, X } from "@lucide/vue";
import type { Transaction } from "~/composables/useTransactions";
import type {
  PeriodType,
  PeriodOption,
} from "~/composables/useTransactionView";
import { formatAmount } from "~/utils/format";

interface Props {
  transactions: Transaction[];
  activePeriod?: PeriodType;
  periods?: PeriodOption[];
  searchQuery?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  totalCount?: number;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  activePeriod: undefined,
  periods: undefined,
  searchQuery: "",
  emptyMessage: "За этот период трат нет",
  isLoading: false,
  totalCount: undefined,
  error: null,
});

const emit = defineEmits<{
  (e: "update:searchQuery", value: string): void;
  (e: "retry"): void;
}>();

const { deleteTransaction } = useTransactions();
const { openModal } = useTransactionModal();

const localSearchQuery = computed({
  get: () => props.searchQuery,
  set: (val: string) => emit("update:searchQuery", val),
});

function clearSearch() {
  emit("update:searchQuery", "");
}

const isSearchVisible = computed(() => {
  const count = props.totalCount ?? props.transactions.length;
  return count > 10 || Boolean(props.searchQuery.trim());
});

const {
  displayedTransactions,
  hasMoreTransactions,
  remainingCount,
  displayedLimit,
  loadMoreTriggerRef,
  loadMore,
  filteredAmountText,
} = useOperationsPagination(toRef(props, "transactions"), {
  isPaused: toRef(props, "isLoading"),
});

watch([() => props.activePeriod, () => props.searchQuery], () => {
  displayedLimit.value = 10;
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
    title="Все операции"
    :count="transactions.length"
    :amount-text="filteredAmountText"
    :has-more="hasMoreTransactions"
    :remaining-count="remainingCount"
    :on-trigger-mounted="(el) => (loadMoreTriggerRef = el)"
    class="relative z-10 w-full"
    @load-more="loadMore"
  >
    <!-- Поисковая строка -->
    <div v-if="isSearchVisible" class="px-5">
      <div class="relative flex items-center w-full my-2.5">
        <GlassInput
          v-model="localSearchQuery"
          type="text"
          inputmode="search"
          placeholder="Поиск по названию или категории..."
          :icon="Search"
          class="w-full text-sm"
        />
        <button
          v-if="searchQuery"
          type="button"
          aria-label="Очистить поиск"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 cursor-pointer"
          @click="clearSearch"
        >
          <X class="size-5" />
        </button>
      </div>
    </div>

    <!-- ПУНКТИР ПЕРЕД СПИСКОМ ПОЗИЦИЙ (ЕСЛИ БЫЛ ПОИСК) -->
    <ReceiptDivider v-if="isSearchVisible" variant="dotted" class="px-5" />

    <!-- ТЕЛО ЧЕКА: СПИСОК ОПЕРАЦИЙ -->
    <div class="px-3">
      <!-- Скелетоны при загрузке -->
      <div v-if="isLoading" class="flex flex-col gap-2 px-2 py-1">
        <TransactionsSkeletonList :count="4" mode="list" />
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
            tx.categoryIcon,
            tx.type,
          ]"
          variant="receipt"
          :icon="tx.categoryIcon"
          :title="tx.name || tx.categoryName"
          :subtitle="tx.name ? tx.categoryName : ''"
          :amount="tx.amount"
          :type="tx.type"
          :date="tx.date"
          interactive
          @click="handleEdit(tx)"
          @delete="confirmDelete(tx)"
        />
      </div>

      <!-- Ошибка загрузки -->
      <GlassErrorState
        v-else-if="error && displayedTransactions.length === 0"
        :as-card="false"
        title="Не удалось загрузить операции"
        :error="error"
        @retry="emit('retry')"
      />

      <!-- Пустое состояние -->
      <div
        v-else
        class="flex flex-col items-center justify-center text-center p-4 gap-2"
      >
        <p class="text-text-secondary text-sm font-medium">
          {{ emptyMessage }}
        </p>
        <button
          v-if="searchQuery.trim()"
          type="button"
          class="text-xs font-semibold text-text-accent active:scale-95 transition-transform underline underline-offset-3 cursor-pointer"
          @click="clearSearch"
        >
          Сбросить поиск
        </button>
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
        <strong class="text-text-accent"
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
