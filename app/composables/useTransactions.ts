/**
 * @module app/composables/useTransactions
 * @fileoverview Composable для CRUD-операций с транзакциями
 * @description
 * Загружает список транзакций и предоставляет методы создания, обновления, удаления.
 * Все запросы защищены заголовком `Authorization: Bearer <token>`.
 */
import { computed } from "vue";

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

export const useTransactions = () => {
  const { token } = useAuth();

  // Реактивные заголовки авторизации
  const authHeaders = computed(() => ({
    Authorization: `Bearer ${token.value}`,
  }));

  // Загружаем транзакции с сервера
  const {
    data: rawTransactions,
    pending,
    error,
    refresh,
  } = useFetch<Transaction[]>("/api/transactions", {
    headers: authHeaders,
  });

  const transactions = computed(() => rawTransactions.value || []);

  // --- CRUD ---

  const addTransaction = async (data: {
    amount: number;
    category_id: string;
    type: "income" | "expense";
    date: string;
    description?: string;
  }) => {
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
      const fetchError = e as {
        data?: { statusMessage?: string };
        message?: string;
      };
      return {
        success: false,
        error:
          fetchError.data?.statusMessage ||
          fetchError.message ||
          "Ошибка сервера",
      };
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
      const fetchError = e as {
        data?: { statusMessage?: string };
        message?: string;
      };
      return {
        success: false,
        error:
          fetchError.data?.statusMessage ||
          fetchError.message ||
          "Ошибка сервера",
      };
    }
  };

  const deleteTransaction = async (id: string) => {
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
      const fetchError = e as {
        data?: { statusMessage?: string };
        message?: string;
      };
      return {
        success: false,
        error:
          fetchError.data?.statusMessage ||
          fetchError.message ||
          "Ошибка сервера",
      };
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
