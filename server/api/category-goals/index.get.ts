/**
 * @module server/api/category-goals/index.get
 * @fileoverview Получение списка целей расходов по категориям пользователя
 * @description
 * Возвращает список всех установленных лимитов трат по категориям для текущего авторизованного пользователя.
 * ---
 * ### Логика работы:
 * 1. Аутентификация пользователя через `requireAuth`.
 * 2. Инициализация scoped-клиента Supabase с токеном пользователя (`getUserSupabase`).
 * 3. Запрос записей из таблицы `category_goals` с фильтрацией по `user_id`.
 * 4. Преобразование полей в camelCase (`categoryId`, `targetAmount`).
 *
 * ### Параметры запроса:
 * - Запрос не принимает параметров.
 *
 * ### Ошибки:
 * - `401 Unauthorized`: токен отсутствует или невалиден.
 * - `500 Internal Server Error`: непредвиденная ошибка базы данных.
 *
 * ### Особенности:
 * - Перехватывает ошибку PostgreSQL `42P01` (отношение не существует), обеспечивая graceful fallback.
 */

import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const { data, error } = await supabase
    .from("category_goals")
    .select("id, category_id, target_amount, created_at, updated_at")
    .eq("user_id", userId);

  if (error) {
    console.error("Ошибка получения целей по категориям:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных при загрузке целей",
    });
  }

  return (data || []).map((goal) => ({
    id: goal.id,
    categoryId: goal.category_id,
    targetAmount: Number(goal.target_amount),
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
  }));
});
