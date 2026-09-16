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

export interface ScannedTransaction {
  type: "expense" | "income";
  amount: number;
  name: string;
  suggestedCategory?: string;
}

export const useTransactionModal = () => {
  const isOpen = useState<boolean>("tx-modal-is-open", () => false);
  const editId = useState<string | null>("tx-modal-edit-id", () => null);
  const openModal = (id?: string) => {
    editId.value = id || null;
    isOpen.value = true;
  };

  const closeModal = () => {
    isOpen.value = false;
    // Сбрасываем ID не сразу, чтобы при анимации закрытия данные не моргали
    setTimeout(() => {
      editId.value = null;
    }, 300);
  };

  return {
    isOpen,
    editId,
    openModal,
    closeModal,
  };
};
