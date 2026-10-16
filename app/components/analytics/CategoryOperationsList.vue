<script setup lang="ts">
/**
 * @module app/components/analytics/CategoryOperationsList
 * @fileoverview Пагинированный список операций категории с бесконечным скроллом
 * @description
 * Отображает список транзакций категории:
 * - пагинация порциями по 10 элементов с автоматической дозагрузкой через IntersectionObserver;
 * - скелетоны во время загрузки или переключения периодов;
 * - интерактивные элементы транзакций с поддержкой удаления и редактирования;
 * - информативное сообщение при отсутствии операций.
 * ---
 * ### Логика работы:
 * 1. Получает отсортированный массив транзакций `transactions`, вычисляет их суммарный объем и отображает количество и сумму в шапке списка (как в finreports).
 * 2. Ограничивает видимый срез `displayedTransactions` размером страницы `displayedLimit`.
 * 3. Отслеживает пересечение триггера внизу списка через `IntersectionObserver` и подгружает следующую порцию.
 * 4. Предоставляет методы удаления (с визуальной индикацией) и редактирования через модальное окно транзакции.
 */
import { ref, computed, toRef } from "vue";
import type { Transaction } from "~/composables/useTransactions";

interface Props {
  transactions: Transaction[];
  title: string;
  emptyText: string;
  isLoading?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  loading: false,
});

const isEffectiveLoading = computed(() => props.isLoading || props.loading);

const { deleteTransaction } = useTransactions();
const { openModal } = useTransactionModal();

const {
  displayedTransactions,
  hasMoreTransactions,
  remainingCount,
  loadMoreTriggerRef,
  loadMore,
  filteredAmountText,
} = useOperationsPagination(toRef(props, "transactions"), {
  isPaused: isEffectiveLoading,
});

const deletingId = ref<string | null>(null);

async function handleDelete(id: string) {
  deletingId.value = id;
  try {
    await deleteTransaction(id);
  } finally {
    deletingId.value = null;
  }
}

function handleEdit(tx: Transaction) {
  openModal(tx);
}

/**
 * Текст бейджа в шапке списка операций (количество и сумма).
 */
const summaryBadgeText = computed(() => {
  if (props.transactions.length === 0) return "";
  return `${props.transactions.length} оп. • ${filteredAmountText.value}`;
});
</script>

<template>
  <GlassCard class="p-4 flex flex-col gap-px pb-1">
    <div class="flex justify-between items-center px-1 mb-1">
      <h3
        class="text-text-secondary font-bold text-xs uppercase tracking-wider truncate"
      >
        {{ title }}
      </h3>
      <span
        v-if="summaryBadgeText"
        class="text-xs font-semibold text-text-secondary glass-pill px-2.5 py-0.5 rounded-full shrink-0 max-w-[65%] truncate text-right"
      >
        {{ summaryBadgeText }}
      </span>
    </div>

    <!-- Скелетоны транзакций при загрузке -->
    <div v-if="isEffectiveLoading" class="flex flex-col">
      <TransactionsSkeletonList :count="3" mode="list" :show-icon="false" />
    </div>

    <!-- Список транзакций -->
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
          deletingId === tx.id,
        ]"
        variant="analytics"
        :title="tx.name || tx.categoryName"
        :amount="tx.amount"
        :type="tx.type"
        :date="tx.date"
        interactive
        :class="{
          'opacity-50 pointer-events-none': deletingId === tx.id,
        }"
        @click="handleEdit(tx)"
        @delete="handleDelete(tx.id)"
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

    <!-- Пустое состояние при отсутствии трат -->
    <p v-else class="text-text-secondary text-xs text-center py-2 px-5">
      {{ emptyText }}
    </p>
  </GlassCard>
</template>
