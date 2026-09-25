/**
 * @module server/api/subscriptions/index.post
 * @fileoverview Серверный обработчик POST-запроса для создания регулярного платежа
 * @description
 * Валидирует и создает новый регулярный платеж пользователя в базе данных.
 * ---
 * ### Параметры запроса:
 * - `name: string` — название платежа (1..100 символов).
 * - `amount: number` — сумма платежа (> 0).
 * - `day_of_month: number` — день списания (1..31).
 * - `category_id?: string | null` — UUID категории.
 */
import { subscriptionSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const body = await readValidatedBody(event, (body) =>
    subscriptionSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { id, name, amount, day_of_month, category_id } = body.data;

  const payload: {
    id?: string;
    user_id: string;
    name: string;
    amount: number;
    day_of_month: number;
    category_id: string | null;
  } = {
    user_id: userId,
    name: name.trim(),
    amount,
    day_of_month,
    category_id: category_id || null,
  };

  if (id) {
    payload.id = id;
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .insert(payload)
    .select(
      `
      id,
      name,
      amount,
      day_of_month,
      is_active,
      created_at,
      updated_at,
      category_id,
      categories (
        id,
        name,
        icon
      )
    `,
    )
    .single();

  if (error || !data) {
    console.error("Ошибка сохранения регулярного платежа:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при сохранении регулярного платежа",
    });
  }

  const cat = Array.isArray(data.categories) ? data.categories[0] : data.categories;

  return {
    id: data.id,
    name: data.name,
    amount: Number(data.amount),
    day_of_month: data.day_of_month,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
    category_id: data.category_id,
    categoryName: cat?.name || "Без категории",
    categoryIcon: cat?.icon || "💸",
  };
});
