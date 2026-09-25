/**
 * @module app/composables/useBudgets
 * @fileoverview Управление месячным бюджетом пользователя
 *
 * @description
 * Загружает и обновляет лимит бюджета через API.
 * Все изменения мутируют глобальное состояние (`useGlobalBudget`),
 * чтобы данные мгновенно отображались по всему приложению.
 */
import { ref, computed, type Ref } from "vue";
import { parseApiError } from "~/utils/api";

let inFlightFetch: Promise<void> | null = null;

export const useBudgets = (options?: { monthlyExpense?: Ref<number> }) => {
  const { token } = useAuth();
  const api = useApi();
  const toast = useAppToast();
  const notifications = useNotifications();

  const budget = useGlobalBudget();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchBudget = async () => {
    if (!token.value) return;
    if (inFlightFetch) return inFlightFetch;

    isLoading.value = true;
    error.value = null;

    inFlightFetch = (async () => {
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
        inFlightFetch = null;
      }
    })();

    return inFlightFetch;
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
        toast.success("Бюджет сохранен");
        notifications.add("Бюджет обновлен", {
          message: `Новый лимит: ${data.amount} ₽`,
          type: "system",
        });
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

  const lastDayOfMonth = computed(() => {
    const today = new Date();
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return last.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  });

  const daysLeft = computed(() => {
    const today = new Date();
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return Math.max(1, last.getDate() - today.getDate() + 1);
  });

  const remainder = computed(() => {
    if (options?.monthlyExpense === undefined) return 0;
    return (budget.value || 0) - options.monthlyExpense.value;
  });

  const dailyGuideline = computed(() => {
    return remainder.value > 0 ? remainder.value / daysLeft.value : 0;
  });

  return {
    budget,
    isLoading,
    error,
    fetchBudget,
    updateBudget,
    lastDayOfMonth,
    daysLeft,
    remainder,
    dailyGuideline,
  };
};
