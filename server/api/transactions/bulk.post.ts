/**
 * @module server/api/transactions/bulk.post
 * @fileoverview Серверный обработчик POST-запроса для массового добавления транзакций
 * @description
 * Эндпоинт позволяет добавить сразу несколько транзакций. Обычно используется после 
 * парсинга чека или импорта.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и извлечение `userId`.
 * 2. `Validation`: Валидация массива транзакций через Zod (`bulkTransactionSchema`).
 * 3. `Data Preparation`: Обогащение каждой транзакции полем `user_id`.
 * 4. `Database Insert`: Массовая вставка (bulk insert) в таблицу `transactions`.
 * 
 * ### Параметры запроса:
 * - `transactions: Array` — массив транзакций (с полями `amount`, `date`, `type`, `category_id`, `description`).
 * 
 * ### Ошибки:
 * - `400 Bad Request`: Ошибка валидации данных массива транзакций.
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка базы данных при массовой вставке.
 * 
 * ### Особенности:
 * - Возвращает массив добавленных транзакций, отформатированных через `formatTransaction`.
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

  return data?.map(formatTransaction) || [];
});
