/**
 * @module app/composables/useCategoryGoals
 * @fileoverview Управление целями и лимитами расходов по категориям
 * @description
 * Загружает, обновляет и удаляет лимиты трат по категориям через API.
 * Хранит цели в глобальном реактивном стейте в виде словаря Record<categoryId, targetAmount>.
 * ---
 * ### Логика работы:
 * 1. Загрузка целей пользователя (`fetchGoals`) с дедупликацией параллельных запросов.
 * 2. Оптимистичное обновление лимита (`setGoal`) с немедленным откликом в UI и откатом при ошибке.
 * 3. Оптимистичное удаление лимита (`removeGoal`) с откатом к предыдущему значению при сбое.
 * 4. Предоставление быстрого синхронного доступа к цели через `getGoal(categoryId)`.
 */

import { ref, computed } from "vue";
import { parseApiError } from "~/utils/api";

let inFlightFetch: Promise<void> | null = null;

export interface CategoryGoalDto {
  id: string;
  categoryId: string;
  targetAmount: number;
  createdAt: string;
  updatedAt: string;
}

export const useCategoryGoals = () => {
  const { token, isAuthenticated } = useAuth();
  const api = useApi();
  const toast = useAppToast();

  const goalsMap = useState<Record<string, number>>(
    "category-goals:map",
    () => ({}),
  );
  const isLoaded = useState<boolean>("category-goals:isLoaded", () => false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchGoals = async (force = false) => {
    if (!isAuthenticated.value || !token.value) return;
    if (!force && isLoaded.value) return;
    if (inFlightFetch) return inFlightFetch;

    isLoading.value = true;
    error.value = null;

    inFlightFetch = (async () => {
      try {
        const data = await api<CategoryGoalDto[]>("/api/category-goals");
        const map: Record<string, number> = {};
        for (const item of data) {
          if (item.categoryId && item.targetAmount > 0) {
            map[item.categoryId] = item.targetAmount;
          }
        }
        goalsMap.value = map;
        isLoaded.value = true;
      } catch (e: unknown) {
        console.warn("Ошибка загрузки целей категорий:", e);
        error.value = parseApiError(e, "Не удалось загрузить цели категорий");
      } finally {
        isLoading.value = false;
        inFlightFetch = null;
      }
    })();

    return inFlightFetch;
  };

  const getGoal = (categoryId: string): number | null => {
    return goalsMap.value[categoryId] ?? null;
  };

  const setGoal = async (categoryId: string, targetAmount: number): Promise<boolean> => {
    if (!isAuthenticated.value || !token.value || isLoading.value) return false;

    const previousAmount = goalsMap.value[categoryId];
    // Оптимистичное обновление
    goalsMap.value = {
      ...goalsMap.value,
      [categoryId]: targetAmount,
    };

    isLoading.value = true;
    error.value = null;

    try {
      await api<{ success: boolean; goal: CategoryGoalDto }>(
        "/api/category-goals",
        {
          method: "POST",
          body: {
            categoryId,
            targetAmount,
          },
        },
      );
      toast.success("Цель по категории сохранена", "🎯 Лимит трат обновлен");
      return true;
    } catch (e: unknown) {
      console.error("Ошибка сохранения цели по категории:", e);
      // Откат при ошибке
      if (previousAmount !== undefined) {
        goalsMap.value = {
          ...goalsMap.value,
          [categoryId]: previousAmount,
        };
      } else {
        const { [categoryId]: _, ...rest } = goalsMap.value;
        goalsMap.value = rest;
      }

      const msg = parseApiError(e, "Не удалось сохранить цель");
      error.value = msg;
      toast.error(msg, "Ошибка");
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const removeGoal = async (categoryId: string): Promise<boolean> => {
    if (!isAuthenticated.value || !token.value || isLoading.value) return false;

    const previousAmount = goalsMap.value[categoryId];
    if (previousAmount === undefined) return true;

    // Оптимистичное удаление
    const { [categoryId]: _, ...rest } = goalsMap.value;
    goalsMap.value = rest;

    isLoading.value = true;
    error.value = null;

    try {
      await api(`/api/category-goals/${categoryId}`, {
        method: "DELETE",
      });
      toast.success("Цель сброшена", "Лимит по категории удален");
      return true;
    } catch (e: unknown) {
      console.error("Ошибка удаления цели по категории:", e);
      // Откат при ошибке
      goalsMap.value = {
        ...goalsMap.value,
        [categoryId]: previousAmount,
      };
      const msg = parseApiError(e, "Не удалось удалить цель");
      error.value = msg;
      toast.error(msg, "Ошибка");
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    goalsMap: computed(() => goalsMap.value),
    isLoaded: computed(() => isLoaded.value),
    isLoading,
    error,
    fetchGoals,
    getGoal,
    setGoal,
    removeGoal,
  };
};
