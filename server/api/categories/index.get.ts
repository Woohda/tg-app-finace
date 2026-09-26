/**
 * @module server/api/categories/index.get
 * @fileoverview Серверный обработчик GET-запроса для получения списка категорий пользователя.
 * @description
 * Возвращает перечень персональных категорий текущего аутентифицированного пользователя.
 * Является чистым, идемпотентным эндпоинтом без побочных эффектов мутации базы данных.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена через утилиту `requireAuth` и получение `userId`.
 * 2. `Supabase Client`: Инициализация защищенного клиента базы данных с токеном пользователя.
 * 3. `Query Execution`: Выборка категорий по `user_id = userId`.
 * 4. `Sorting`: Сортировка по типу (`type` ASC: сначала expense, затем income) и названию (`name` ASC).
 * 5. `Response`: Возврат массива найденных категорий клиенту.
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен авторизации.
 * - `500 Internal Server Error`: Ошибка выполнения запроса к базе данных Supabase.
 *
 * ### Особенности:
 * - Идемпотентность: не производит вставок в БД, исключая race condition при параллельных запросах.
 */

import type { Database } from "~/types/database.types";
import { getUserSupabase } from "~~/server/utils/db";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const { data: userCategories, error: userError } = await supabase
    .from("categories")
    .select("id, name, type, icon, user_id, created_at")
    .eq("user_id", userId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (userError) {
    console.error("Ошибка получения категорий пользователя:", userError);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return (userCategories ?? []) as Category[];
});
