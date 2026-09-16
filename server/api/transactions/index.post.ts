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

  // Возвращаем в отформатированном виде
  const cat = Array.isArray(data.categories) ? data.categories[0] : data.categories;
  return {
    id: data.id,
    amount: data.amount,
    type: data.type,
    name: data.name,
    date: data.date,
    categoryId: cat?.id || "",
    categoryName: cat?.name || "Неизвестно",
    categoryIcon: cat?.icon || "💸",
  };
});
