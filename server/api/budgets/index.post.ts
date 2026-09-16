/**
 * @module server/api/budgets/index.post
 * @fileoverview Серверный обработчик POST-запроса для установки бюджета
 * @description
 * Создает новую запись о бюджете. История бюджетов сохраняется 
 * для возможной будущей аналитики, актуальным считается самый свежий.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и получение `userId`.
 * 2. `Validation`: Валидация входного тела (содержит `amount`).
 * 3. `Insert`: Создание новой записи в таблице `budgets`.
 * 
 * ### Параметры запроса:
 * - `amount: number` — сумма бюджета (больше 0).
 * 
 * ### Ошибки:
 * - `400 Bad Request`: Ошибка валидации данных (отрицательная сумма).
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка базы данных.
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
    .upsert(
      {
        amount,
        user_id: userId,
        period_date: periodDate,
      },
      { onConflict: "user_id,period_date" }
    )
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
