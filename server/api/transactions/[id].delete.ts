/**
 * @module server/api/transactions/[id].delete
 * @fileoverview Серверный обработчик DELETE-запроса для удаления транзакции
 * @description
 * Удаляет транзакцию по её идентификатору.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и извлечение `userId`.
 * 2. `Validation`: Чтение `id` из параметров маршрута.
 * 3. `Database Deletion`: Удаление записи из таблицы `transactions` с проверкой `user_id`.
 * 
 * ### Параметры запроса:
 * - `id` (в URL) — идентификатор транзакции.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: Не передан ID транзакции.
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка удаления из базы данных.
 * 
 * ### Особенности:
 * - Безопасность: `user_id: userId` гарантирует, что пользователь не может удалить чужую транзакцию.
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID транзакции",
    });
  }

  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "Транзакция не найдена",
    });
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Ошибка удаления транзакции:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при удалении транзакции",
    });
  }

  return { success: true };
});
