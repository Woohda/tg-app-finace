/**
 * @module server/api/transactions/bulk.post
 * @fileoverview Добавление нескольких транзакций одновременно (например, после сканирования чека)
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";
import { bulkTransactionSchema } from "~/types/validate";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

  const body = await readValidatedBody(event, (body) =>
    bulkTransactionSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const transactionsToInsert = body.data.transactions.map((t) => ({
    amount: t.amount,
    category_id: t.category_id,
    type: t.type,
    date: t.date,
    name: t.name || null,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .insert(transactionsToInsert).select(`
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
    `);

  if (error) {
    console.error("Ошибка массового сохранения транзакций:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при сохранении транзакций",
    });
  }

  const formattedData =
    data?.map((t) => {
      const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
      return {
        id: t.id,
        amount: t.amount,
        type: t.type,
        name: t.name,
        date: t.date,
        categoryId: cat?.id || "",
        categoryName: cat?.name || "Неизвестно",
        categoryIcon: cat?.icon || "💸",
      };
    }) || [];

  return formattedData;
});
