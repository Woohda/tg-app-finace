/**
 * @module server/api/subscriptions/index.post
 * @fileoverview Серверный обработчик POST-запроса для создания регулярного платежа
 * @description
 * Валидирует и создает новый регулярный платеж пользователя в базе данных.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и извлечение `userId`.
 * 2. `Validation`: Валидация входных данных через Zod (`subscriptionSchema`).
 * 3. `Database Mutation`: Вставка записи в таблицу `subscriptions` с выборкой через `SUBSCRIPTION_SELECT_FIELDS`.
 *
 * ### Параметры запроса:
 * - `name: string` — название платежа (1..100 символов).
 * - `amount: number` — сумма платежа (> 0).
 * - `day_of_month: number` — день списания (1..31).
 * - `category_id?: string | null` — UUID категории.
 * - `id?: string` — опциональный UUID для идемпотентного создания.
 *
 * ### Ошибки:
 * - `400 Bad Request`: Ошибка валидации параметров.
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка сохранения записи в базе данных.
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
    .select(SUBSCRIPTION_SELECT_FIELDS)
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
