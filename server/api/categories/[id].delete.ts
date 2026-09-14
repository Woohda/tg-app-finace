/**
 * @module server/api/categories/[id].delete
 * @fileoverview Серверный обработчик DELETE-запроса для удаления категории
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID категории",
    });
  }

  const supabase = serverSupabaseServiceRole<Database>(event);

  // Проверяем наличие хотя бы 1 транзакции (LIMIT 1) для оптимизации
  const { data: existingTx, error: txError } = await supabase
    .from("transactions")
    .select("id")
    .eq("category_id", id)
    .eq("user_id", userId)
    .limit(1);

  if (txError) {
    console.error("Ошибка при проверке транзакций:", txError);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при проверке транзакций",
    });
  }

  // Если массив не пустой, значит транзакции есть
  if (existingTx && existingTx.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Невозможно удалить категорию, так как с ней связаны транзакции. Сначала удалите их или перенесите в другую категорию.",
    });
  }

  // Удаляем только если категория принадлежит пользователю
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Ошибка удаления категории:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return { success: true };
});
