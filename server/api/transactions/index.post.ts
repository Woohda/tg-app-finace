/**
 * @module server/api/transactions/index.post
 * @fileoverview Добавление новой транзакции
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "../../../app/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);
  
  const body = await readBody(event);
  
  const { amount, category_id, type, date, description } = body;

  // Базовая валидация
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: "Некорректная сумма" });
  }
  if (!category_id) {
    throw createError({ statusCode: 400, statusMessage: "Не указана категория" });
  }
  if (!type || !["income", "expense"].includes(type)) {
    throw createError({ statusCode: 400, statusMessage: "Некорректный тип транзакции" });
  }
  if (!date) {
    throw createError({ statusCode: 400, statusMessage: "Не указана дата" });
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      amount,
      category_id,
      type,
      date,
      description: description || null,
      user_id: userId,
    })
    .select(`
      id,
      amount,
      type,
      description,
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
    description: data.description,
    date: data.date,
    categoryId: cat?.id || "",
    categoryName: cat?.name || "Неизвестно",
    categoryIcon: cat?.icon || "💸",
  };
});
