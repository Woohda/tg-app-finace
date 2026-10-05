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
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { Search, X } from "@lucide/vue";
import type { Transaction } from "~/composables/useTransactions";
import type {
  PeriodType,
  PeriodOption,
} from "~/composables/useTransactionView";
import { formatAmount } from "~/utils/format";

interface Props {
  transactions: Transaction[];
  activePeriod: PeriodType;
  periods: PeriodOption[];
  searchQuery?: string;
  emptyMessage?: string;
  pending?: boolean;
  totalCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: "",
  emptyMessage: "За этот период трат нет",
  pending: false,
  totalCount: undefined,
});

const emit = defineEmits<{
  (e: "update:activePeriod", value: PeriodType): void;
  (e: "update:searchQuery", value: string): void;
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

const INITIAL_PAGE_SIZE = 10;
const displayedLimit = ref(INITIAL_PAGE_SIZE);

watch(
  [() => props.transactions, () => props.activePeriod, () => props.searchQuery],
  () => {
    displayedLimit.value = INITIAL_PAGE_SIZE;
  },
);

const displayedTransactions = computed(() =>
  props.transactions.slice(0, displayedLimit.value),
);

const hasMoreTransactions = computed(
  () => displayedLimit.value < props.transactions.length,
);

const remainingCount = computed(
  () => props.transactions.length - displayedLimit.value,
);

const loadMore = () => {
  displayedLimit.value += INITIAL_PAGE_SIZE;
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
          !props.pending
        ) {
          loadMore();
        }
      },
      { rootMargin: "120px" },
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

const filteredExpense = computed(() =>
  props.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0),
);

const filteredIncome = computed(() =>
  props.transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0),
);

/**
 * Форматированная сумма отфильтрованных операций.
 */
const filteredAmountText = computed(() => {
  if (props.transactions.length === 0) return "";
  if (filteredExpense.value > 0 && filteredIncome.value > 0) {
    return `−${formatAmount(filteredExpense.value)} / +${formatAmount(filteredIncome.value)}`;
  }
  if (filteredIncome.value > 0) {
    return `+${formatAmount(filteredIncome.value)}`;
  }
  return `−${formatAmount(filteredExpense.value)}`;
});

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
    <div v-if="pending" class="flex flex-col gap-3">
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
          deletingId === tx.id,
        ]"
        :icon="tx.categoryIcon"
        :title="tx.name || tx.categoryName"
        :subtitle="tx.name ? tx.categoryName : ''"
        :amount="tx.amount"
        :type="tx.type"
        :date="tx.date"
        interactive
        :class="{ 'opacity-50 pointer-events-none': deletingId === tx.id }"
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
</template>
