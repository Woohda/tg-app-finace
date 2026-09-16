/**
 * @module server/api/categories/[id].put
 * @fileoverview Серверный обработчик PUT-запроса для редактирования категории
 * @description
 * Обновляет название и иконку категории в базе данных.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена.
 * 2. `Validation`: Чтение параметров роута и валидация тела запроса через Zod (`categoryUpdateSchema`).
 * 3. `Database Update`: Обновление полей `name` и `icon` в таблице `categories`.
 *
 * ### Параметры запроса:
 * - `id` (в URL) — идентификатор обновляемой категории.
 * - `name?: string` — новое название.
 * - `icon?: string | null` — новая иконка.
 *
 * ### Ошибки:
 * - `400 Bad Request`: Ошибка валидации данных Zod.
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка БД при обновлении.
 *
 * ### Особенности:
 * - Разрешено обновлять только категории, принадлежащие текущему пользователю.
 */

import { categoryUpdateSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID категории",
    });
  }

  const body = await readValidatedBody(event, (body) =>
    categoryUpdateSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { name, icon } = body.data;

  const supabase = getUserSupabase(token);

  // Обновляем только если категория принадлежит пользователю
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: name.trim(),
      icon: icon ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, name, type, icon, user_id, created_at")
    .single();

  if (error) {
    console.error("Ошибка обновления категории:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return data;
});
