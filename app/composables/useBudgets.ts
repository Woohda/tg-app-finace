/**
 * @module app/composables/useBudgets
 * @fileoverview Composable для управления бюджетом пользователя
 * @description
 * Предоставляет состояние и методы для загрузки и обновления ежемесячного бюджета пользователя.
 * ---
 * ### Логика работы:
 * 1. `Fetch Budget`: При загрузке делает GET запрос, если пользователь авторизован
 * 2. `Update Budget`: При изменении делает POST запрос на бэкенд
 * 
 * ### API:
 * - `budget: Ref<number>`: Текущий установленный бюджет (по умолчанию 0)
 * - `isLoading: Ref<boolean>`: Состояние загрузки
 * - `error: Ref<string | null>`: Ошибка при выполнении запроса
 * - `fetchBudget()`: Загружает бюджет с сервера
 * - `updateBudget(amount)`: Обновляет бюджет на сервере
 * 
 * ### Зависимости:
 * - `useAuth` из `~/composables/useAuth` (доступ к JWT токену)
 */
import { ref } from "vue";
import { parseApiError } from "~/utils/api";

export const useBudgets = () => {
  const { token } = useAuth();

  const budget = useGlobalBudget();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchBudget = async () => {
    if (!token.value || isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const data = await $fetch<{ amount: number }>("/api/budgets", {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });
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
      const data = await $fetch<{ amount: number }>("/api/budgets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
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
