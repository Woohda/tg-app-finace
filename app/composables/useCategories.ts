/**
 * @module app/composables/useCategories
 * @fileoverview Composable для управления категориями (получение и создание)
 * @description
 * Этот модуль предоставляет реактивное состояние списка категорий пользователя 
 * и методы для взаимодействия с серверным API (`/api/categories`).
 * ---
 * ### Логика работы:
 * 1. `Token Injection`: Получает актуальный JWT токен из composable `useAuth`
 * 2. `State Management`: Хранит реактивный массив `categories`, флаг загрузки `isLoading` и текст ошибки `error`
 * 3. `Fetch Categories`: Запрашивает список категорий пользователя через GET-запрос с Bearer-авторизацией (если категорий нет, бэкенд автоматически скопирует базовые шаблоны).
 * 4. `Create Category`: Отправляет POST-запрос на создание категории, оптимистично добавляет её в локальное состояние с сохранением сортировки
 *
 * ### API:
 * - `categories: Ref<Category[]>`: Реактивный список всех доступных категорий
 * - `isLoading: Ref<boolean>`: Индикатор выполнения сетевого запроса
 * - `error: Ref<string | null>`: Сообщение об ошибке при выполнении запросов
 * - `fetchCategories()`: Загружает список категорий с сервера
 * - `createCategory(name, type, icon?)`: Создаёт новую категорию и добавляет её в локальный список
 * - `updateCategory(id, name, icon?)`: Обновляет существующую категорию
 * - `deleteCategory(id)`: Удаляет категорию (если с ней нет связанных транзакций)
 *
 * ### Параметры createCategory:
 * - `name: string` — наименование категории (обязательное)
 * - `type: "income" | "expense"` — тип операции: доход или расход
 * - `icon?: string` — строковое представление иконки (эмодзи, например '🛒')
 *
 * ### Особенности:
 * - Автоматическая сортировка списка категорий при добавлении (сначала расходы, затем доходы; по алфавиту)
 * - Все запросы защищены заголовком `Authorization: Bearer <token>`
 * - Не выполняет сетевые запросы при отсутствии активной сессии (`token === null`)
 *
 * ### Примечания:
 * - Все категории, возвращаемые сервером, принадлежат конкретному пользователю (`user_id` текущей сессии).
 * - Базовые (системные) категории с `user_id === null` используются бэкендом только как шаблон для клонирования при первой загрузке.
 *
 * ### Зависимости:
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
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
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
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
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
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
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
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
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
