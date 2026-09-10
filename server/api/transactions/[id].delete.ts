/**
 * @module server/api/transactions/[id].delete
 * @fileoverview Удаление транзакции по ID
 * @description
 * Удаляет транзакцию, принадлежащую текущему пользователю.
 * Ownership: удаляются только транзакции текущего пользователя.
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "../../../app/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Не указан ID транзакции" });
  }

  // Проверяем существование и ownership через select перед delete,
  // т.к. Supabase delete не возвращает count затронутых строк надёжно
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Транзакция не найдена" });
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Ошибка удаления транзакции:", error);
    throw createError({ statusCode: 500, statusMessage: "Ошибка при удалении транзакции" });
  }

  return { success: true };
});
