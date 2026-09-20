/**
 * @module app/composables/useCategories
 * @fileoverview Управление пользовательскими категориями
 * 
 * @description
 * Обеспечивает получение, создание, удаление и сортировку пользовательских категорий.
 * Инкапсулирует взаимодействие с API (`/api/categories`) и кеширует список
 * в глобальное состояние `useGlobalCategories`.
 */
import type { Database } from "~/types/database.types";
import { parseApiError } from "~/utils/api";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useCategories = () => {
  const { token } = useAuth();
  const api = useApi();
  const toast = useAppToast();
  const notifications = useNotifications();

  const categories = useGlobalCategories();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const sortCategories = (cats: Category[]) => {
    cats.sort((a, b) => {
      if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const fetchCategories = async () => {
    if (!token.value || isLoading.value) {
      if (!token.value) error.value = "Пользователь не авторизован";
      return;
    }

    // Если категории уже загружены в глобальный стейт, не запрашиваем их снова
    if (categories.value.length > 0) {
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const data = await api<Category[]>("/api/categories");
      categories.value = data;
    } catch (e: unknown) {
      console.error("Ошибка загрузки категорий:", e);
      error.value = parseApiError(e, "Не удалось загрузить категории");
    } finally {
      isLoading.value = false;
    }
  };

  const createCategory = async (
    name: string,
    type: "income" | "expense",
    icon?: string,
  ) => {
    if (!token.value || isLoading.value) {
      if (!token.value) error.value = "Пользователь не авторизован";
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const newCategory = await api<Category>("/api/categories", {
        method: "POST",
        body: { name, type, icon },
      });

      categories.value.push(newCategory);
      sortCategories(categories.value);
      
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
      isLoading.value = false;
    }
  };

  const updateCategory = async (id: string, name: string, icon?: string) => {
    if (!token.value || isLoading.value) return false;

    isLoading.value = true;
    error.value = null;

    try {
      const updated = await api<Category>(`/api/categories/${id}`, {
        method: "PUT",
        body: { name, icon },
      });

      const index = categories.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        categories.value[index] = updated;
        sortCategories(categories.value);
      }
      
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
      isLoading.value = false;
    }
  };

  const deleteCategory = async (id: string) => {
    if (!token.value || isLoading.value) return false;

    isLoading.value = true;
    error.value = null;

    try {
      await api(`/api/categories/${id}`, {
        method: "DELETE",
      });

      const cat = categories.value.find((c) => c.id === id);
      categories.value = categories.value.filter((c) => c.id !== id);
      
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
      isLoading.value = false;
    }
  };

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
