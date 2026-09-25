/**
 * @module server/api/subscriptions/[id].put
 * @fileoverview Серверный обработчик PUT-запроса для обновления регулярного платежа
 * @description
 * Обновляет существующий регулярный платеж пользователя по его ID.
 */
import type { Database } from "~~/app/types/database.types";
import { subscriptionUpdateSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";

type SubscriptionUpdate =
  Database["public"]["Tables"]["subscriptions"]["Update"];

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID регулярного платежа",
    });
  }

  const body = await readValidatedBody(event, (body) =>
    subscriptionUpdateSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const supabase = getUserSupabase(token);
  const { name, amount, day_of_month, category_id, is_active } = body.data;

  const updateData: SubscriptionUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updateData.name = name.trim();
  if (amount !== undefined) updateData.amount = amount;
  if (day_of_month !== undefined) updateData.day_of_month = day_of_month;
  if (category_id !== undefined) updateData.category_id = category_id || null;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data, error } = await supabase
    .from("subscriptions")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
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
    console.error("Ошибка обновления регулярного платежа:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при обновлении регулярного платежа",
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
