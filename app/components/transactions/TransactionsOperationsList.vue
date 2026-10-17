<script setup lang="ts">
/**
 * @module app/components/transactions/TransactionsOperationsList
 * @fileoverview Пагинированный список финансовых операций и транзакций с поиском и фильтрацией
 * @description
 * Отображает список операций раздела «Финансовый отчет»:
 * - переключатель временного интервала (День, Неделя, Месяц) через GlassSegmentedControl;
 * - контекстная строка поиска с очисткой по названию и категории;
 * - пагинация порциями по 10 элементов с автоматической подгрузкой через IntersectionObserver;
 * - скелетоны загрузки транзакций;
 * - интерактивные элементы транзакций (удаление, редактирование);
 * - сводный бейдж с количеством и объемом трат/доходов;
 * - информативное состояние при отсутствии операций.
 * ---
 * ### Логика работы:
 * 1. Принимает отфильтрованный список транзакций `transactions`, вычисляет их сумму и выводит счетчик в шапке.
 * 2. Синхронизирует выбранный период `activePeriod` и поисковый запрос `searchQuery` с родителем через v-model.
 * 3. Ограничивает видимый срез `displayedTransactions` размером страницы `displayedLimit` для сохранения 60 FPS.
 * 4. Автоматически подгружает следующую страницу при приближении к концу списка через `IntersectionObserver`.
 * 5. Предоставляет удаление с блокировкой строки и редактирование транзакций через модальное окно.
 */
import { ref, computed, watch, toRef } from "vue";
import { Search, X } from "@lucide/vue";
import type { Transaction } from "~/composables/useTransactions";
import type {
  PeriodType,
  PeriodOption,
} from "~/composables/useTransactionView";

interface Props {
  transactions: Transaction[];
  activePeriod: PeriodType;
  periods: PeriodOption[];
  searchQuery?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  totalCount?: number;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: "",
  emptyMessage: "За этот период трат нет",
  isLoading: false,
  totalCount: undefined,
  error: null,
});

const emit = defineEmits<{
  (e: "update:activePeriod", value: PeriodType): void;
  (e: "update:searchQuery", value: string): void;
  (e: "retry"): void;
}>();

const { deleteTransaction } = useTransactions();
const { openModal } = useTransactionModal();

const localPeriod = computed({
  get: () => props.activePeriod,
  set: (val: PeriodType) => emit("update:activePeriod", val),
});

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

/**
 * Текст бейджа в шапке списка транзакций (количество и сумма).
 */
const summaryBadgeText = computed(() => {
  if (props.transactions.length === 0) {
    return props.searchQuery.trim() ? "Найдено: 0" : "";
  }
  if (props.searchQuery.trim()) {
    return `Найдено: ${props.transactions.length} • ${filteredAmountText.value}`;
  }
  return `${props.transactions.length} оп. • ${filteredAmountText.value}`;
});
</script>

<template>
  <GlassCard class="relative z-10 pb-2">
    <div class="flex flex-col gap-3 mb-3">
      <div class="flex items-center justify-between gap-2">
        <h2
          class="text-base font-bold text-text-primary uppercase tracking-wide truncate"
        >
          Все транзакции:
        </h2>
        <span
          v-if="summaryBadgeText"
          class="text-xs font-semibold text-text-secondary glass-pill px-2.5 py-0.5 rounded-full shrink-0 max-w-[80%] truncate text-right"
        >
          {{ summaryBadgeText }}
        </span>
      </div>

      <!-- Переключатель периодов -->
      <GlassSegmentedControl
        v-model="localPeriod"
        :options="periods"
        size="md"
      />

      <!-- Поисковая строка -->
      <div v-if="isSearchVisible" class="relative flex items-center w-full">
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

    <!-- Скелетоны транзакций (загрузка) -->
    <div v-if="isLoading" class="flex flex-col gap-3">
      <TransactionsSkeletonList :count="4" mode="list" />
    </div>

    <!-- Список транзакций -->
    <div
      v-else-if="displayedTransactions.length > 0"
      class="flex flex-col gap-2"
    >
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

      <!-- Ленивая подгрузка (триггер скролла / кнопка) -->
      <div
        v-if="hasMoreTransactions"
        ref="loadMoreTriggerRef"
        class="flex flex-col items-center justify-center pt-2.5 pb-1"
      >
        <button
          type="button"
          class="text-xs font-semibold text-text-accent hover:text-text-primary active:scale-95 transition-all py-1.5 px-4 rounded-full glass-pill cursor-pointer flex items-center gap-1.5 a11y-focus"
          @click="loadMore"
        >
          <span>Показать ещё (ещё {{ remainingCount }})</span>
        </button>
      </div>
    </div>

    <!-- Ошибка загрузки -->
    <GlassErrorState
      v-else-if="error && displayedTransactions.length === 0"
      :as-card="false"
      title="Не удалось загрузить операции"
      :error="error"
      @retry="emit('retry')"
    />

    <!-- Пустое состояние при отсутствии трат -->
    <div
      v-else
      class="flex flex-col items-center justify-center text-center pb-5 gap-2"
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
  </GlassCard>

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
