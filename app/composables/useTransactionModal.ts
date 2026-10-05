/**
 * @module app/composables/useTransactionModal
 * @fileoverview Управление состоянием модального окна транзакций
 * 
 * @description
 * Предоставляет глобальное состояние для открытия и закрытия `TransactionModal.vue`.
 * Позволяет открывать модалку как для создания новой транзакции, так и для
 * редактирования существующей, передавая `editId`.
 * 
 * ### Логика:
 * - `isOpen`: Реактивный флаг видимости модального окна.
 * - `editId`: ID транзакции для редактирования (если null — режим создания).
 * - `closeModal`: Закрывает окно и обнуляет `editId` с небольшой задержкой для плавности анимации.
 */
import { useState } from "nuxt/app";

export interface EditTransactionData {
  id: string;
  amount: number;
  type: "expense" | "income";
  categoryId: string;
  name?: string | null;
  date: string;
}

export interface ScannedTransaction {
  type: "expense" | "income";
  amount: number;
  name: string;
  suggestedCategory?: string;
}

export const useTransactionModal = () => {
  const isOpen = useState<boolean>("tx-modal-is-open", () => false);
  const editId = useState<string | null>("tx-modal-edit-id", () => null);
  const editData = useState<EditTransactionData | null>(
    "tx-modal-edit-data",
    () => null,
  );

  const openModal = (txOrId?: string | EditTransactionData) => {
    if (typeof txOrId === "object" && txOrId !== null) {
      editId.value = txOrId.id;
      editData.value = txOrId;
    } else if (typeof txOrId === "string") {
      editId.value = txOrId;
      editData.value = null;
    } else {
      editId.value = null;
      editData.value = null;
    }
    isOpen.value = true;
  };

  const closeModal = () => {
    isOpen.value = false;
    // Сбрасываем ID и данные не сразу, чтобы при анимации закрытия форма не моргала
    setTimeout(() => {
      editId.value = null;
      editData.value = null;
    }, 300);
  };

  return {
    isOpen,
    editId,
    editData,
    openModal,
    closeModal,
  };
};
