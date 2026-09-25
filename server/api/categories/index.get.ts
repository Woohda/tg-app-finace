/**
 * @module server/api/categories/index.get
 * @fileoverview Серверный обработчик GET-запроса для получения списка категорий
 * @description
 * Эндпоинт возвращает объединенный перечень системных категорий по умолчанию (`user_id IS NULL`)
 * и персональных категорий текущего аутентифицированного пользователя (`user_id = auth.userId`).
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена через утилиту `requireAuth` и получение `userId`
 * 2. `Supabase Client`: Инициализация защищенного клиента Supabase Service Role
 * 3. `Query Execution`: Выборка категорий с фильтром `user_id.is.null,user_id.eq.${userId}`
 * 4. `Sorting`: Сортировка по типу (`type` DESC: сначала расходы, затем доходы) и имени (`name` ASC)
 * 5. `Response`: Возврат массива найденных категорий клиенту
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен авторизации
 * - `500 Internal Server Error`: Ошибка выполнения запроса к базе данных Supabase
 *
 * ### Особенности:
 * - Доступ защищен на уровне сервера: пользователь ни при каких условиях не видит чужие персональные категории
 * - Запрос выполняется в обход RLS с использованием Service Role ключа, фильтрация строго контролируется кодом сервера
 *
 * ### Зависимости:
 * - `requireAuth` из `~/server/utils/requireAuth`
 * - `serverSupabaseServiceRole` из `#supabase/server`
 * - `Database` из `~/app/types/database.types`
 */

import type { Database } from "~/types/database.types";
import { getUserSupabase } from "~~/server/utils/db";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type NewCategory = Database["public"]["Tables"]["categories"]["Insert"];

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  // 1. Получаем личные категории пользователя
  let userCategories: Category[] = [];
  const { data: fetchedCategories, error: userError } = await supabase
    .from("categories")
    .select("id, name, type, icon, user_id, created_at")
    .eq("user_id", userId)
    .order("type", { ascending: false })
    .order("name", { ascending: true });

  if (fetchedCategories) {
    userCategories = fetchedCategories;
  }

  if (userError) {
    console.error("Ошибка получения категорий пользователя:", userError);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  // 2. Если у пользователя еще нет категорий, клонируем системные шаблоны (user_id IS NULL)
  if (!userCategories || userCategories.length === 0) {
    const { data: templateCategories, error: tplError } = await supabase
      .from("categories")
      .select("id, name, type, icon")
      .is("user_id", null);

    if (tplError) {
      console.error("Ошибка получения системных шаблонов:", tplError);
      throw createError({
        statusCode: 500,
        statusMessage: "Ошибка инициализации категорий",
      });
    }

    if (templateCategories && templateCategories.length > 0) {
      const newCategories = templateCategories.map((c: NewCategory) => ({
        name: c.name,
        type: c.type,
        icon: c.icon,
        user_id: userId,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("categories")
        .insert(newCategories)
        .select("id, name, type, icon, user_id, created_at");

      if (insertError || !inserted) {
        console.error("Ошибка при клонировании категорий:", insertError);
      } else {
        userCategories = inserted;

        // Сортируем итоговый массив
        userCategories.sort((a, b) => {
          if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      }
    }
  }

  return userCategories;
});
