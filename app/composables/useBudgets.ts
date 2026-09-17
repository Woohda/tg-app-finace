/**
 * @module app/composables/useBudgets
 * @fileoverview Управление месячным бюджетом пользователя
 * 
 * @description
 * Загружает и обновляет лимит бюджета через API.
 * Все изменения мутируют глобальное состояние (`useGlobalBudget`), 
 * чтобы данные мгновенно отображались по всему приложению.
 */
import { ref } from "vue";
import { parseApiError } from "~/utils/api";

export const useBudgets = () => {
  const { token } = useAuth();
  const api = useApi();

  const budget = useGlobalBudget();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchBudget = async () => {
    if (!token.value || isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const data = await api<{ amount: number }>("/api/budgets");
      if (data && data.amount > 0) {
        budget.value = data.amount;
      }
    } catch (e: unknown) {
      console.error("Ошибка загрузки бюджета:", e);
      error.value = parseApiError(e, "Не удалось загрузить бюджет");
    } finally {
      isLoading.value = false;
    }
  };

  const updateBudget = async (amount: number) => {
    if (!token.value || isLoading.value) return false;

    isLoading.value = true;
    error.value = null;

    try {
      const data = await api<{ amount: number }>("/api/budgets", {
        method: "POST",
        body: { amount },
      });

      if (data && data.amount > 0) {
        budget.value = data.amount;
      }
      return true;
    } catch (e: unknown) {
      console.error("Ошибка сохранения бюджета:", e);
      error.value = parseApiError(e, "Не удалось сохранить бюджет");
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    budget,
    isLoading,
    error,
    fetchBudget,
    updateBudget,
  };
};
