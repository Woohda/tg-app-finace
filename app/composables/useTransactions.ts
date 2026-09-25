/**
 * @module app/composables/useTransactions
 * @fileoverview Единое реактивное хранилище (Store) и CRUD-операции для транзакций
 *
 * @description
 * Обеспечивает получение, создание, обновление и удаление транзакций через API.
 * Использует централизованный кэш диапазонов на базе `useState` для мгновенного отклика UI,
 * устраняя коллизии ключей при переходах между страницами через BottomNav.
 * Поддерживает массовое добавление (`addBulkTransactions`).
 *
 * ### Логика работы:
 * 1. Получение транзакций с реактивной фильтрацией по датам (startDate, endDate).
 * 2. Кэширование по динамическому ключу диапазона дат (мгновенный показ без повторных запросов).
 * 3. Автоматическая инвалидация кэша и обновление счетчика версий (`txVersion`) при CRUD-мутациях.
 */
import { computed, ref, watch, type Ref } from "vue";
import { parseApiError } from "~/utils/api";
import { useLocalStorage } from "@vueuse/core";

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
  const toast = useAppToast();
  const notifications = useNotifications();

  const txCache = useTransactionCache();
  const txEntities = useTransactionEntities();
  const txVersion = useGlobalTransactionsVersion();

  const query = computed(() => {
    const q: Record<string, string> = {};
    if (options?.startDate?.value) {
      q.startDate = formatDateISO(options.startDate.value);
    }
    if (options?.endDate?.value) {
      q.endDate = formatDateISO(options.endDate.value);
    }
    return q;
  });

  const cacheKey = computed(() => {
    const start = query.value.startDate || "all";
    const end = query.value.endDate || "all";
    return `${start}_${end}`;
  });

  const pending = ref(!txCache.value[cacheKey.value]);
  const isMutating = ref(false);
  const error = ref<unknown>(null);

  const fetchTransactions = async (force = false): Promise<void> => {
    const key = cacheKey.value;
    if (!force && txCache.value[key]) {
      return;
    }

    pending.value = true;
    error.value = null;

    try {
      const data = await api<Transaction[]>("/api/transactions", {
        query: query.value,
      });

      txCache.value = {
        ...txCache.value,
        [key]: data,
      };

      const entitiesUpdate = { ...txEntities.value };
      data.forEach((tx) => {
        entitiesUpdate[tx.id] = tx;
      });
      txEntities.value = entitiesUpdate;
    } catch (err: unknown) {
      error.value = err;
      console.error("Ошибка загрузки транзакций:", err);
    } finally {
      pending.value = false;
    }
  };

  const transactions = computed<Transaction[]>(() => {
    return txCache.value[cacheKey.value] || [];
  });

  // Реактивный слушатель: реагирует на изменение дат (периода) и глобальной версии (CRUD)
  watch(
    [cacheKey, txVersion],
    () => {
      fetchTransactions();
    },
    { immediate: true },
  );

  const refresh = async () => {
    await fetchTransactions(true);
  };

  const knownTxIds = useLocalStorage<string[]>("app-known-tx-ids", []);

  watch(
    transactions,
    (newVal) => {
      if (!newVal || newVal.length === 0) return;

      if (knownTxIds.value.length === 0) {
        // Первый запуск на устройстве: просто запоминаем IDs
        knownTxIds.value = newVal.map((t) => t.id).slice(0, 150);
        return;
      }

      const unseen = newVal.filter((t) => !knownTxIds.value.includes(t.id));
      if (unseen.length > 0) {
        unseen.forEach((t) => {
          notifications.add(`🤖 Бот: ${t.categoryName}`, {
            message: t.name ? `${t.name}: ${t.amount} ₽` : `${t.amount} ₽`,
            type: t.type,
          });
        });
        const updated = [...unseen.map((t) => t.id), ...knownTxIds.value];
        knownTxIds.value = updated.slice(0, 150);
      }
    },
    { immediate: true },
  );

  const invalidateAll = () => {
    txCache.value = {};
    txVersion.value++;
  };

  const addTransaction = async (data: {
    id?: string;
    amount: number;
    category_id: string;
    type: "income" | "expense";
    date: string;
    name?: string | null;
  }) => {
    if (isMutating.value)
      return { success: false, error: "Запрос уже выполняется" };
    isMutating.value = true;
    try {
      const payload = {
        ...data,
        id:
          data.id ||
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : undefined),
      };

      const newTx = await api<Transaction>("/api/transactions", {
        method: "POST",
        body: payload,
      });

      knownTxIds.value.unshift(newTx.id);

      txEntities.value = {
        ...txEntities.value,
        [newTx.id]: newTx,
      };

      invalidateAll();

      toast.success("Транзакция добавлена");
      notifications.add(newTx.categoryName, {
        message: newTx.name
          ? `${newTx.name}: ${newTx.amount} ₽`
          : `${newTx.amount} ₽`,
        type: newTx.type,
      });

      return { success: true };
    } catch (e: unknown) {
      console.error("Ошибка при добавлении:", e);
      return { success: false, error: parseApiError(e, "Ошибка сервера") };
    } finally {
      isMutating.value = false;
    }
  };

  const updateTransaction = async (
    id: string,
    data: {
      amount?: number;
      category_id?: string;
      type?: "income" | "expense";
      date?: string;
      name?: string | null;
    },
  ) => {
    if (isMutating.value)
      return { success: false, error: "Запрос уже выполняется" };
    isMutating.value = true;
    try {
      const updated = await api<Transaction>(`/api/transactions/${id}`, {
        method: "PATCH",
        body: data,
      });

      txEntities.value = {
        ...txEntities.value,
        [updated.id]: updated,
      };

      invalidateAll();

      const txName = updated.name || updated.categoryName;
      toast.success("Транзакция обновлена");
      notifications.add("Транзакция изменена", {
        message: `${txName} : ${updated.amount} ₽`,
        type: updated.type,
      });

      return { success: true };
    } catch (e: unknown) {
      console.error("Ошибка при обновлении:", e);
      return { success: false, error: parseApiError(e, "Ошибка сервера") };
    } finally {
      isMutating.value = false;
    }
  };

  const deleteTransaction = async (id: string) => {
    if (isMutating.value)
      return { success: false, error: "Запрос уже выполняется" };
    isMutating.value = true;
    try {
      const deletedTx =
        txEntities.value[id] || transactions.value.find((t) => t.id === id);

      await api(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      const { [id]: _, ...updatedEntities } = txEntities.value;
      txEntities.value = updatedEntities;

      invalidateAll();

      toast.success("Транзакция удалена");
      if (deletedTx) {
        const txName = deletedTx.name || deletedTx.categoryName;
        notifications.add("Транзакция удалена", {
          message: `${txName}: ${deletedTx.amount} ₽`,
          type: "system",
        });
      }

      return { success: true };
    } catch (e: unknown) {
      console.error("Ошибка при удалении:", e);
      return { success: false, error: parseApiError(e, "Ошибка сервера") };
    } finally {
      isMutating.value = false;
    }
  };

  const addBulkTransactions = async (
    transactionsToSave: {
      id?: string;
      amount: number;
      category_id: string;
      type: "income" | "expense" | string;
      date: string;
      name?: string;
    }[],
  ) => {
    if (isMutating.value)
      return { success: false, error: "Запрос уже выполняется" };
    isMutating.value = true;
    try {
      const preparedTransactions = transactionsToSave.map((t) => ({
        ...t,
        id:
          t.id ||
          (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : undefined),
      }));

      const newTransactions = await api<Transaction[]>(
        "/api/transactions/bulk",
        {
          method: "POST",
          body: { transactions: preparedTransactions },
        },
      );

      const newIds = newTransactions.map((t) => t.id);
      knownTxIds.value = [...newIds, ...knownTxIds.value].slice(0, 150);

      const updatedEntities = { ...txEntities.value };
      newTransactions.forEach((t) => {
        updatedEntities[t.id] = t;
      });
      txEntities.value = updatedEntities;

      invalidateAll();

      toast.success(`Успешно добавлено: ${transactionsToSave.length} шт.`);

      newTransactions.forEach((t) => {
        notifications.add(t.categoryName, {
          message: t.name ? `${t.name}: ${t.amount} ₽` : `${t.amount} ₽`,
          type: t.type as "expense" | "income",
        });
      });

      return { success: true };
    } catch (e: unknown) {
      console.error("Ошибка при массовом добавлении:", e);
      return { success: false, error: parseApiError(e, "Ошибка сервера") };
    } finally {
      isMutating.value = false;
    }
  };

  return {
    transactions,
    pending,
    isMutating,
    error,
    refresh,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addBulkTransactions,
  };
};
