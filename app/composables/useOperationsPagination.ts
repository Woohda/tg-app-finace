/**
 * @module app/composables/useOperationsPagination
 * @fileoverview Единая логика пагинации, бесконечной прокрутки и сводки сумм для списков операций
 * @description
 * Инкапсулирует порционную загрузку транзакций (10 элементов по умолчанию),
 * отслеживание прокрутки через IntersectionObserver и агрегированный подсчет
 * сумм доходов и расходов для шапок списков.
 */
import { ref, computed, watch, onMounted, onUnmounted, type Ref } from "vue";
import type { Transaction } from "~/composables/useTransactions";
import { formatAmount } from "~/utils/format";

export interface UseOperationsPaginationOptions {
  pageSize?: number;
  rootMargin?: string;
  isPaused?: Ref<boolean>;
}

export function useOperationsPagination(
  items: Ref<Transaction[]>,
  options: UseOperationsPaginationOptions = {},
) {
  const pageSize = options.pageSize ?? 10;
  const rootMargin = options.rootMargin ?? "120px";
  const displayedLimit = ref(pageSize);

  watch(items, () => {
    displayedLimit.value = pageSize;
  });

  const displayedTransactions = computed(() =>
    items.value.slice(0, displayedLimit.value),
  );

  const hasMoreTransactions = computed(
    () => displayedLimit.value < items.value.length,
  );

  const remainingCount = computed(
    () => Math.max(0, items.value.length - displayedLimit.value),
  );

  const loadMore = () => {
    displayedLimit.value += pageSize;
  };

  const loadMoreTriggerRef = ref<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (
            entries[0]?.isIntersecting &&
            hasMoreTransactions.value &&
            !options.isPaused?.value
          ) {
            loadMore();
          }
        },
        { rootMargin },
      );
    }
  });

  watch(loadMoreTriggerRef, (el) => {
    if (observer) {
      observer.disconnect();
      if (el) {
        observer.observe(el);
      }
    }
  });

  onUnmounted(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });

  // Агрегированная сводка трат и доходов
  const filteredExpense = computed(() =>
    items.value
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  const filteredIncome = computed(() =>
    items.value
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0),
  );

  const filteredAmountText = computed(() => {
    if (items.value.length === 0) return "";
    if (filteredExpense.value > 0 && filteredIncome.value > 0) {
      return `−${formatAmount(filteredExpense.value)} / +${formatAmount(filteredIncome.value)}`;
    }
    if (filteredIncome.value > 0) {
      return `+${formatAmount(filteredIncome.value)}`;
    }
    return `−${formatAmount(filteredExpense.value)}`;
  });

  return {
    displayedTransactions,
    hasMoreTransactions,
    remainingCount,
    displayedLimit,
    loadMoreTriggerRef,
    loadMore,
    filteredExpense,
    filteredIncome,
    filteredAmountText,
  };
}
