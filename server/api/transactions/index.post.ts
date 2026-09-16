/**
 * @module server/api/transactions/index.post
 * @fileoverview Добавление новой транзакции
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";
import { transactionBackendSchema } from "~/types/validate";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

  const body = await readValidatedBody(event, (body) => transactionBackendSchema.safeParse(body));

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { amount, category_id, type, date, name } = body.data;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      amount,
      category_id,
      type,
      date,
      name: name || null,
      user_id: userId,
    })
    .select(`
      id,
      amount,
      type,
      name,
      date,
      created_at,
      categories (
        id,
        name,
        icon
      )
    `)
    .single();

  if (error) {
    console.error("Ошибка сохранения транзакции:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при сохранении транзакции",
    });
  }

  return formatTransaction(data);
});
