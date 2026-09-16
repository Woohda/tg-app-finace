/**
 * @module server/api/transactions/index.post
 * @fileoverview Серверный обработчик POST-запроса для создания транзакции
 * @description
 * Валидирует и добавляет новую транзакцию в базу данных, привязывая её к текущему пользователю.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена.
 * 2. `Validation`: Проверка тела запроса через Zod (`transactionBackendSchema`).
 * 3. `Database Insert`: Добавление записи в `transactions` с `user_id`.
 *
 * ### Параметры запроса:
 * - `amount: number` — сумма транзакции.
 * - `type: "income" | "expense"` — тип.
 * - `category_id: string` — UUID категории.
 * - `date: string` — ISO дата.
 * - `description?: string` — комментарий (опционально).
 *
 * ### Ошибки:
 * - `400 Bad Request`: Ошибка валидации параметров.
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка при вставке в БД.
 *
 * ### Особенности:
 * - Возвращает созданную транзакцию, отформатированную через `formatTransaction`.
 */

import { transactionBackendSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const body = await readValidatedBody(event, (body) =>
    transactionBackendSchema.safeParse(body),
  );

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
    .select(
      `
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
    `,
    )
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
