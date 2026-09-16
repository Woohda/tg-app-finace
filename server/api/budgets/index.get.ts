/**
 * @module server/api/budgets/index.get
 * @fileoverview Серверный обработчик GET-запроса для получения бюджета
 * @description
 * Возвращает самый последний установленный лимит бюджета
 * текущего авторизованного пользователя.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и получение `userId`.
 * 2. `Query`: Выборка одной самой свежей записи из таблицы `budgets` для пользователя.
 * 3. `Response`: Возвращает объект с `amount`. Если бюджета нет, возвращает `{ amount: 0 }`.
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка базы данных.
 *
 * ### Зависимости:
 * - `requireAuth` из `~/server/utils/requireAuth`
 */
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  // Получаем самый последний установленный бюджет
  const { data, error } = await supabase
    .from("budgets")
    .select("amount")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Ошибка получения бюджета:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return {
    amount: data?.amount ?? 0,
  };
});
