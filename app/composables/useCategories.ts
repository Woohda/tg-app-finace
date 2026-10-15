/**
 * @module app/composables/useCategories
 * @fileoverview Управление пользовательскими категориями
 * @description
 * Обеспечивает получение, создание, удаление и сортировку пользовательских категорий.
 * Инкапсулирует взаимодействие с API (`/api/categories`) и кеширует список
 * в глобальное состояние `useGlobalCategories`.
 * ---
 * ### Логика работы:
 * 1. Загрузка категорий (`fetchCategories`) с дедупликацией in-flight запросов и кешированием в `useGlobalCategories`.
 * 2. Добавление, редактирование и удаление категорий с оптимистичным обновлением списка и инвалидацией кеша транзакций.
 * 3. Автоматическая сортировка (`sortCategories`): расходы перед доходами, по алфавиту.
 */
import { ref, computed } from "vue";
import type { Database } from "~/types/database.types";
import { parseApiError } from "~/utils/api";

type Category = Database["public"]["Tables"]["categories"]["Row"];

let inFlightCategoriesFetch: Promise<void> | null = null;

export const useCategories = () => {
  const { token } = useAuth();
  const api = useApi();
  const toast = useAppToast();
  const notifications = useNotifications();

  const categories = useGlobalCategories();
  const isLoaded = useGlobalCategoriesIsLoaded();
  const isFetching = ref(false);
  const isMutating = ref(false);
  const error = ref<string | null>(null);

  const sortCategories = (cats: Category[]) => {
    cats.sort((a, b) => {
      if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const fetchCategories = async (force = false) => {
    if (import.meta.server && !token.value) {
      return;
    }

    // Если категории уже загружены в глобальный стейт, не запрашиваем их снова
    if (!force && isLoaded.value) {
      return;
    }

    if (inFlightCategoriesFetch) {
      return inFlightCategoriesFetch;
    }

    isFetching.value = true;
    error.value = null;

    inFlightCategoriesFetch = (async () => {
      try {
        const data = await api<Category[]>("/api/categories");
        categories.value = data;
        isLoaded.value = true;
      } catch (e: unknown) {
        console.error("Ошибка загрузки категорий:", e);
        error.value = parseApiError(e, "Не удалось загрузить категории");
      } finally {
        isFetching.value = false;
        inFlightCategoriesFetch = null;
      }
    })();

    return inFlightCategoriesFetch;
  };

  const createCategory = async (
    name: string,
    type: "income" | "expense",
    icon?: string,
    id?: string,
  ) => {
    if (isMutating.value) {
      return null;
    }

    isMutating.value = true;
    error.value = null;

    try {
      const categoryId =
        id ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : undefined);

      const formattedName = capitalizeFirstLetter(name);

      const newCategory = await api<Category>("/api/categories", {
        method: "POST",
        body: { id: categoryId, name: formattedName, type, icon },
      });

      categories.value.push(newCategory);
      sortCategories(categories.value);
      isLoaded.value = true;
      
      toast.success("Категория добавлена");
      notifications.add("Новая категория", {
        message: newCategory.name,
        type: "system",
      });

      return newCategory;
    } catch (e: unknown) {
      console.error("Ошибка создания категории:", e);
      error.value = parseApiError(e, "Не удалось создать категорию");
      return null;
    } finally {
      isMutating.value = false;
    }
  };

  const updateCategory = async (id: string, name: string, icon?: string) => {
    if (isMutating.value) return false;

    isMutating.value = true;
    error.value = null;

    try {
      const formattedName = capitalizeFirstLetter(name);

      const updated = await api<Category>(`/api/categories/${id}`, {
        method: "PUT",
        body: { name: formattedName, icon },
      });

      const index = categories.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        categories.value[index] = updated;
        sortCategories(categories.value);
      }

      useTransactionCache().value = {};
      useGlobalTransactionsVersion().value++;
      
      toast.success("Категория обновлена");
      notifications.add("Категория изменена", {
        message: updated.name,
        type: "system",
      });
      
      return true;
    } catch (e: unknown) {
      console.error("Ошибка обновления категории:", e);
      error.value = parseApiError(e, "Не удалось обновить категорию");
      return false;
    } finally {
      isMutating.value = false;
    }
  };

  const deleteCategory = async (id: string) => {
    if (isMutating.value) return false;

    isMutating.value = true;
    error.value = null;

    try {
      await api(`/api/categories/${id}`, {
        method: "DELETE",
      });

      const cat = categories.value.find((c) => c.id === id);
      categories.value = categories.value.filter((c) => c.id !== id);

      useTransactionCache().value = {};
      useGlobalTransactionsVersion().value++;
      
      toast.success("Категория удалена");
      if (cat) {
        notifications.add("Категория удалена", {
          message: cat.name,
          type: "system",
        });
      }
      
      return true;
    } catch (e: unknown) {
      console.error("Ошибка удаления категории:", e);
      error.value = parseApiError(e, "Не удалось удалить категорию");
      return false;
    } finally {
      isMutating.value = false;
    }
  };

  return {
    categories,
    isLoading: computed(() => !isLoaded.value || isFetching.value),
    isLoaded,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
