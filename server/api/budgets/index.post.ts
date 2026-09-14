/**
 * @module server/api/budgets/index.post
 * @fileoverview Серверный обработчик POST-запроса для установки бюджета
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";
import { budgetSchema } from "~/types/validate";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  const body = await readValidatedBody(event, (body) => budgetSchema.safeParse(body));
  
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { amount } = body.data;

  const supabase = serverSupabaseServiceRole<Database>(event);

  // Используем текущую дату для period_date, так как мы применяем глобальный лимит
  const periodDate = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      amount,
      user_id: userId,
      period_date: periodDate,
    })
    .select("amount")
    .single();

  if (error) {
    console.error("Ошибка установки бюджета:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return data;
});
