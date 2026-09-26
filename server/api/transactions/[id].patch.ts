/**
 * @module server/api/transactions/[id].patch
 * @fileoverview Серверный обработчик PATCH-запроса для обновления транзакции
 * @description
 * Частично обновляет данные существующей транзакции (например, категорию, дату, сумму).
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и извлечение `userId`.
 * 2. `Validation`: Чтение `id` из URL и валидация тела через Zod (`transactionPatchSchema`).
 * 3. `Database Update`: Обновление переданных полей в БД с привязкой к `user_id` и выборка через `TRANSACTION_SELECT_FIELDS`.
 *
 * ### Параметры запроса:
 * - `id: string` (в URL) — UUID транзакции.
 * - В теле запроса (опционально): `amount`, `category_id`, `date`, `name`, `type`.
 *
 * ### Ошибки:
 * - `400 Bad Request`: Ошибка валидации данных или отсутствие ID.
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `404 Not Found`: Транзакция с указанным ID не найдена.
 * - `500 Internal Server Error`: Ошибка выполнения обновления в БД.
 *
 * ### Особенности:
 * - Обновляются только транзакции текущего пользователя (защита через `user_id`).
 * - Возвращает обновленную транзакцию, прогнанную через `formatTransaction`.
 */

import type { Database } from "~/types/database.types";
import { transactionPatchSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID транзакции",
    });
  }

  const body = await readValidatedBody(event, (body) =>
    transactionPatchSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: body.error.issues[0]?.message || "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { amount, category_id, type, date, name } = body.data;

  // Собираем объект обновления
  const updateData: Database["public"]["Tables"]["transactions"]["Update"] = {};
  if (amount !== undefined) updateData.amount = amount;
  if (category_id !== undefined) updateData.category_id = category_id;
  if (type !== undefined) updateData.type = type;
  if (date !== undefined) updateData.date = date;
  if (name !== undefined) updateData.name = name || null;

  const { data, error } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select(TRANSACTION_SELECT_FIELDS)
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      throw createError({
        statusCode: 404,
        statusMessage: "Транзакция не найдена",
      });
    }
    console.error("Ошибка обновления транзакции:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при обновлении транзакции",
    });
  }

  return formatTransaction(data);
});
