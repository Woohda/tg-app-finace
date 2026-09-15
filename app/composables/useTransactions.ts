/**
 * @module app/composables/useTransactions
 * @fileoverview Composable для CRUD-операций с транзакциями
 * @description
 * Загружает список транзакций и предоставляет методы создания, обновления, удаления.
 * Все запросы защищены заголовком `Authorization: Bearer <token>`.
 * ---
 * ### Логика работы:
 * 1. Инициализирует `useFetch` для получения списка транзакций при загрузке.
 * 2. Предоставляет CRUD операции через `$fetch`, обновляя локальное состояние через `refresh()`.
 *
 * ### API:
 * - `transactions: ComputedRef<Transaction[]>`: Вычисляемый массив всех транзакций
 * - `pending: Ref<boolean>`: Индикатор загрузки из useFetch
 * - `error: Ref<Error | null>`: Ошибка запроса
 * - `addTransaction(data)`: Создает новую транзакцию
 * - `updateTransaction(id, data)`: Обновляет существующую транзакцию
 * - `deleteTransaction(id)`: Удаляет транзакцию
 * - `refresh()`: Метод для ручного перезапроса списка транзакций
 *
 * ### Зависимости:
 * - `useAuth` из `~/composables/useAuth` (доступ к JWT токену)
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
  description: string | null;
  date: string;
}

export const useTransactions = (options?: { startDate?: Ref<Date>; endDate?: Ref<Date> }) => {
  const { token } = useAuth();

  const authHeaders = computed(() => ({
    Authorization: `Bearer ${token.value}`,
  }));

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
    return `transactions-list-${query.value.startDate || 'default'}-${query.value.endDate || 'default'}`;
  });

  const {
    data: rawTransactions,
    pending,
    error,
    refresh,
  } = useFetch<Transaction[]>("/api/transactions", {
    headers: authHeaders,
    query,
    key: cacheKey.value,
    watch: [query],
  });

  const transactions = computed(() => rawTransactions.value || []);

  const addTransaction = async (data: {
    amount: number;
    category_id: string;
    type: "income" | "expense";
    date: string;
    description?: string;
  }) => {
    if (pending.value) return { success: false, error: "Запрос уже выполняется" };
    try {
      const newTx = await $fetch<Transaction>("/api/transactions", {
        method: "POST",
        headers: authHeaders.value,
        body: data,
      });
      if (rawTransactions.value) {
        rawTransactions.value.unshift(newTx);
      }
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
      description?: string;
    },
  ) => {
    if (pending.value) return { success: false, error: "Запрос уже выполняется" };
    try {
      const updated = await $fetch<Transaction>(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: authHeaders.value,
        body: data,
      });
      if (rawTransactions.value) {
        const index = rawTransactions.value.findIndex((t) => t.id === id);
        if (index !== -1) {
          rawTransactions.value[index] = updated;
        }
      }
      return { success: true };
    } catch (e: unknown) {
      console.error("Ошибка при обновлении:", e);
      return { success: false, error: parseApiError(e, "Ошибка сервера") };
    }
  };

  const deleteTransaction = async (id: string) => {
    if (pending.value) return { success: false, error: "Запрос уже выполняется" };
    try {
      await $fetch(`/api/transactions/${id}`, {
        method: "DELETE",
        headers: authHeaders.value,
      });
      if (rawTransactions.value) {
        rawTransactions.value = rawTransactions.value.filter(
          (t) => t.id !== id,
        );
      }
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
