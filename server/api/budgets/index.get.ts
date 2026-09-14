/**
 * @module server/api/budgets/index.get
 * @fileoverview Серверный обработчик GET-запроса для получения бюджета
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

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
