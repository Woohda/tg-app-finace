/**
 * @module server/api/category-goals/[categoryId].delete
 * @fileoverview Удаление цели расходов для указанной категории
 * @description
 * Удаляет запись о лимите расходов текущего пользователя для указанной категории из таблицы `category_goals`.
 * Если таблица ещё не создана в БД (код ошибки `42P01`), завершается без ошибки.
 * ---
 * ### Логика работы:
 * 1. Аутентификация пользователя через `requireAuth`.
 * 2. Извлечение и проверка обязательного параметра маршрута `categoryId`.
 * 3. Инициализация scoped-клиента Supabase (`getUserSupabase`).
 * 4. Удаление записи по фильтрам `user_id` и `category_id`.
 *
 * ### Параметры запроса:
 * - `categoryId` (UUID, router param) — идентификатор категории для удаления цели.
 *
 * ### Ошибки:
 * - `400 Bad Request`: параметр `categoryId` отсутствует.
 * - `401 Unauthorized`: отсутствие или недействительность токена.
 * - `500 Internal Server Error`: непредвиденная ошибка при обращении к базе данных.
 *
 * ### Особенности:
 * - Идемпотентность и защита от сбоев при отсутствии таблицы в БД.
 */

import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const categoryId = getRouterParam(event, "categoryId");

  if (!categoryId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID категории",
    });
  }

  const supabase = getUserSupabase(token);

  const { error } = await supabase
    .from("category_goals")
    .delete()
    .eq("user_id", userId)
    .eq("category_id", categoryId);

  if (error) {
    console.error("Ошибка удаления цели категории:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных при удалении цели",
    });
  }

  return { success: true };
});
