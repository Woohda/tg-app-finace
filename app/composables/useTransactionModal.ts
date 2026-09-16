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
  const scanResults = useState<ScannedTransaction[]>(
    "tx-modal-scan-results",
    () => [],
  );

  const openModal = (id?: string) => {
    editId.value = id || null;
    isOpen.value = true;
  };

  const closeModal = () => {
    isOpen.value = false;
    // Сбрасываем ID не сразу, чтобы при анимации закрытия данные не моргали
    setTimeout(() => {
      editId.value = null;
      scanResults.value = [];
    }, 300);
  };

  return {
    isOpen,
    editId,
    scanResults,
    openModal,
    closeModal,
  };
};
