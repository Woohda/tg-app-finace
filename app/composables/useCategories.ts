/**
 * @module app/composables/useCategories
 * @fileoverview Управление пользовательскими категориями
 * 
 * @description
 * - `useAuth` из `~/composables/useAuth` (доступ к JWT токену)
 * - `Database` из `~/types/database.types` (типизация строк таблицы `categories`)
 */
import type { Database } from "~/types/database.types";
import { parseApiError } from "~/utils/api";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useCategories = () => {
  const { token } = useAuth();

  const categories = useGlobalCategories();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const authHeaders = computed(() => ({
    Authorization: `Bearer ${token.value}`,
  }));

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

    isLoading.value = true;
    error.value = null;

    try {
      const data = await $fetch<Category[]>("/api/categories", {
        headers: authHeaders.value,
      });
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
      const newCategory = await $fetch<Category>("/api/categories", {
        method: "POST",
        headers: authHeaders.value,
        body: { name, type, icon },
      });

      categories.value.push(newCategory);
      sortCategories(categories.value);

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
      const updated = await $fetch<Category>(`/api/categories/${id}`, {
        method: "PUT",
        headers: authHeaders.value,
        body: { name, icon },
      });

      const index = categories.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        categories.value[index] = updated;
        sortCategories(categories.value);
      }
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
      await $fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: authHeaders.value,
      });

      categories.value = categories.value.filter((c) => c.id !== id);
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
