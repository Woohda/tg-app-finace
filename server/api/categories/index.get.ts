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
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "../../../app/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  const supabase = serverSupabaseServiceRole<Database>(event);

  // Системные категории (user_id IS NULL) + свои категории
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, type, icon, user_id, created_at")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("type", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("Ошибка получения категорий:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return data;
});
