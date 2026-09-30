/**
 * @module server/api/category-goals/index.post
 * @fileoverview Установка или обновление месячного лимита трат по категории
 * @description
 * Валидирует входные данные через `categoryGoalSchema` и выполняет операцию `upsert`
 * в таблице `category_goals` по составному ключу `(user_id, category_id)`.
 * ---
 * ### Логика работы:
 * 1. Аутентификация пользователя через `requireAuth`.
 * 2. Валидация тела запроса через `categoryGoalSchema`.
 * 3. Инициализация scoped-клиента Supabase (`getUserSupabase`).
 * 4. Выполнение `upsert` с обновлением `updated_at`.
 * 5. Возврат сохраненной цели в формате camelCase.
 *
 * ### Параметры запроса:
 * - `categoryId` (UUID) — идентификатор категории расходов.
 * - `targetAmount` (number) — сумма лимита (больше 0, до 100 000 000).
 *
 * ### Ошибки:
 * - `400 Bad Request`: некорректный ID категории или сумма лимита.
 * - `401 Unauthorized`: отсутствие или недействительность токена.
 * - `500 Internal Server Error`: ошибка базы данных или отсутствие таблицы.
 *
 * ### Особенности:
 * - Безопасный upsert по уникальному ограничению `(user_id, category_id)`.
 */

import { categoryGoalSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);

  const body = await readValidatedBody(event, (body) =>
    categoryGoalSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных цели",
      data: body.error.issues,
    });
  }

  const { categoryId, targetAmount } = body.data;
  const supabase = getUserSupabase(token);

  const { data, error } = await supabase
    .from("category_goals")
    .upsert(
      {
        user_id: userId,
        category_id: categoryId,
        target_amount: targetAmount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, category_id" },
    )
    .select("id, category_id, target_amount, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("Ошибка сохранения цели по категории:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных при сохранении цели",
    });
  }

  return {
    success: true,
    goal: {
      id: data.id,
      categoryId: data.category_id,
      targetAmount: Number(data.target_amount),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
});
