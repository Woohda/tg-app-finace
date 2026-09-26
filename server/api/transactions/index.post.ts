/**
 * @module server/api/transactions/index.post
 * @fileoverview Серверный обработчик POST-запроса для создания транзакции
 * @description
 * Валидирует и добавляет новую транзакцию в базу данных, привязывая её к текущему пользователю.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена.
 * 2. `Validation`: Проверка тела запроса через Zod (`transactionSchema`).
 * 3. `Database Mutation`: Добавление или upsert записи в `transactions` с `user_id` и выборка через `TRANSACTION_SELECT_FIELDS`.
 *
 * ### Параметры запроса:
 * - `amount: number` — сумма транзакции.
 * - `type: "income" | "expense"` — тип операции.
 * - `category_id: string` — UUID категории.
 * - `name: string` — название или комментарий.
 * - `date: string` — локальная дата в формате ISO (YYYY-MM-DD).
 * - `id?: string` — опциональный UUID для идемпотентного сохранения/upsert.
 *
 * ### Ошибки:
 * - `400 Bad Request`: Ошибка валидации параметров.
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка при вставке в БД.
 *
 * ### Особенности:
 * - Возвращает созданную транзакцию, отформатированную через `formatTransaction`.
 */

import { transactionSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const body = await readValidatedBody(event, (body) =>
    transactionSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { id, amount, category_id, type, date, name } = body.data;

  const payload: {
    id?: string;
    amount: number;
    category_id: string;
    type: string;
    date: string;
    name: string | null;
    user_id: string;
  } = {
    amount,
    category_id,
    type,
    date,
    name: name || null,
    user_id: userId,
  };

  if (id) {
    payload.id = id;
  }

  const dbQuery = id
    ? supabase.from("transactions").upsert(payload, { onConflict: "id" })
    : supabase.from("transactions").insert(payload);

  const { data, error } = await dbQuery
    .select(TRANSACTION_SELECT_FIELDS)
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
