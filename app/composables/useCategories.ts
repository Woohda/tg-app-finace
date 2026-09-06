/**
 * @module app/composables/useCategories
 * @fileoverview Composable для управления категориями (получение и создание)
 * @description
 * Этот модуль предоставляет реактивное состояние списка категорий пользователя (включая системные)
 * и методы для взаимодействия с серверным API (`/api/categories`).
 * ---
 * ### Логика работы:
 * 1. `Token Injection`: Получает актуальный JWT токен из composable `useAuth`
 * 2. `State Management`: Хранит реактивный массив `categories`, флаг загрузки `isLoading` и текст ошибки `error`
 * 3. `Fetch Categories`: Запрашивает объединённый список системных и пользовательских категорий через GET-запрос с Bearer-авторизацией
 * 4. `Create Category`: Отправляет POST-запрос на создание категории, оптимистично добавляет её в локальное состояние с сохранением сортировки
 *
 * ### API:
 * - `categories: Ref<Category[]>`: Реактивный список всех доступных категорий
 * - `isLoading: Ref<boolean>`: Индикатор выполнения сетевого запроса
 * - `error: Ref<string | null>`: Сообщение об ошибке при выполнении запросов
 * - `fetchCategories()`: Загружает список категорий с сервера
 * - `createCategory(name, type, icon?)`: Создаёт новую категорию и добавляет её в локальный список
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
 * - Системные категории имеют `user_id === null` и доступны всем пользователям
 * - Пользовательские категории привязаны к конкретному `user_id` текущей сессии
 *
 * ### Зависимости:
 * - `useAuth` из `~/composables/useAuth` (доступ к JWT токену)
 * - `Database` из `~/types/database.types` (типизация строк таблицы `categories`)
 */
import type { Database } from "~/types/database.types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useCategories = () => {
  const { token } = useAuth();

  const categories = ref<Category[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchCategories = async () => {
    if (!token.value) {
      error.value = "Пользователь не авторизован";
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
      const fetchError = e as {
        data?: { statusMessage?: string };
        message?: string;
      };
      error.value =
        fetchError.data?.statusMessage ||
        fetchError.message ||
        "Не удалось загрузить категории";
    } finally {
      isLoading.value = false;
    }
  };

  const createCategory = async (
    name: string,
    type: "income" | "expense",
    icon?: string,
  ) => {
    if (!token.value) {
      error.value = "Пользователь не авторизован";
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

      // Добавляем новую категорию в локальное состояние
      categories.value.push(newCategory);
      // Сортируем (как на сервере)
      categories.value.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "expense" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return newCategory;
    } catch (e: unknown) {
      console.error("Ошибка создания категории:", e);
      const fetchError = e as {
        data?: { statusMessage?: string };
        message?: string;
      };
      error.value =
        fetchError.data?.statusMessage ||
        fetchError.message ||
        "Не удалось создать категорию";
      return null;
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
  };
};
