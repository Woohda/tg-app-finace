/**
 * @module server/api/subscriptions/[id].delete
 * @fileoverview Серверный обработчик DELETE-запроса для удаления регулярного платежа
 * @description
 * Удаляет регулярный платеж пользователя по его ID.
 */
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID регулярного платежа",
    });
  }

  const supabase = getUserSupabase(token);

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Ошибка удаления регулярного платежа:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при удалении регулярного платежа",
    });
  }

  return { success: true };
});
