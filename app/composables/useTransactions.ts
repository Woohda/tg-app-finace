/**
 * @module app/composables/useTransactions
 * @fileoverview Управление CRUD-операциями для транзакций
 *
 * @description
 * Обеспечивает получение, создание, обновление и удаление транзакций через API.
 * Использует `useFetch` для автоматического реактивного обновления списка.
 * Поддерживает массовое добавление (`addBulkTransactions`).
 */
import { computed, type Ref } from "vue";
import { parseApiError } from "~/utils/api";

export interface Transaction {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  type: "income" | "expense";
  name: string | null;
  date: string;
}

export const useTransactions = (options?: {
  startDate?: Ref<Date>;
  endDate?: Ref<Date>;
}) => {
  const api = useApi();

  const query = computed(() => {
    const q: Record<string, string> = {};
    if (options?.startDate?.value) {
      q.startDate = options.startDate.value.toISOString();
    }
    if (options?.endDate?.value) {
      q.endDate = options.endDate.value.toISOString();
    }
    return q;
  });

  const cacheKey = computed(() => {
    return `transactions-list-${query.value.startDate || "default"}-${query.value.endDate || "default"}`;
  });

  const txVersion = useGlobalTransactionsVersion();

  const {
    data: rawTransactions,
    pending,
    error,
    refresh,
  } = useAsyncData<Transaction[]>(
    cacheKey.value,
    () => api("/api/transactions", { query: query.value }),
    { watch: [query, txVersion] },
  );

  const transactions = computed(() => rawTransactions.value || []);

  const clearOtherCaches = () => {
    clearNuxtData(
      (key) =>
        typeof key === "string" &&
        key.startsWith("transactions-list-") &&
        key !== cacheKey.value,
    );
  };

  const addTransaction = async (data: {
    amount: number;
    category_id: string;
    type: "income" | "expense";
    date: string;
    name?: string;
  }) => {
    if (pending.value)
      return { success: false, error: "Запрос уже выполняется" };
    try {
      const newTx = await api<Transaction>("/api/transactions", {
        method: "POST",
        body: data,
      });
      if (rawTransactions.value) {
        rawTransactions.value.unshift(newTx);
      }
      clearOtherCaches();
      txVersion.value++;
      return { success: true };
    } catch (e: unknown) {
      console.error("Ошибка при добавлении:", e);
      return { success: false, error: parseApiError(e, "Ошибка сервера") };
    }
  };

  const updateTransaction = async (
    id: string,
    data: {
      amount?: number;
      category_id?: string;
      type?: "income" | "expense";
      date?: string;
      name?: string;
    },
  ) => {
    if (pending.value)
      return { success: false, error: "Запрос уже выполняется" };
    try {
      const updated = await api<Transaction>(`/api/transactions/${id}`, {
        method: "PATCH",
        body: data,
      });
      if (rawTransactions.value) {
        const index = rawTransactions.value.findIndex((t) => t.id === id);
        if (index !== -1) {
          rawTransactions.value[index] = updated;
        }
      }
      clearOtherCaches();
      txVersion.value++;
      return { success: true };
    } catch (e: unknown) {
      console.error("Ошибка при обновлении:", e);
      return { success: false, error: parseApiError(e, "Ошибка сервера") };
    }
  };

  const deleteTransaction = async (id: string) => {
    if (pending.value)
      return { success: false, error: "Запрос уже выполняется" };
    try {
      await api(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      if (rawTransactions.value) {
        rawTransactions.value = rawTransactions.value.filter(
          (t) => t.id !== id,
        );
      }
      clearOtherCaches();
      txVersion.value++;
      return { success: true };
    } catch (e: unknown) {
      console.error("Ошибка при удалении:", e);
      return { success: false, error: parseApiError(e, "Ошибка сервера") };
    }
  };

  return {
    transactions,
    pending,
    error,
    refresh,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
};
