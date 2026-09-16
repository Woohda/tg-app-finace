/**
 * @module server/api/categories/index.post
 * @fileoverview Серверный обработчик POST-запроса для создания новой категории
 * @description
 * Эндпоинт валидирует входные параметры и создаёт новую пользовательскую категорию в базе данных,
 * связывая её с идентификатором текущего авторизованного пользователя.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена через `requireAuth` и извлечение надежного `userId`
 * 2. `Body Parsing & Validation`: Чтение тела запроса, проверка обязательного непустого поля `name` и допустимости `type` ('expense' | 'income')
 * 3. `Database Insert`: Вставка записи в таблицу `categories` с привязкой к `user_id: userId`
 * 4. `Response`: Возврат созданной записи со сгенерированным UUID и таймстемпом
 *
 * ### Параметры запроса:
 * - `name: string` — непустое название категории
 * - `type: "expense" | "income"` — тип категории
 * - `icon?: string | null` — иконка (эмодзи)
 *
 * ### Ошибки:
 * - `400 Bad Request`: Пропущен параметр `name` или передан недопустимый `type`
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен
 * - `500 Internal Server Error`: Ошибка вставки записи в базу данных Supabase
 *
 * ### Особенности:
 * - `user_id` всегда берётся из верифицированного JWT токена; клиент не может подменить автора или создать глобальную категорию
 *
 */

import { categorySchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);

  const body = await readValidatedBody(event, (body) =>
    categorySchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { name, type, icon } = body.data;

  const supabase = getUserSupabase(token);

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: name.trim(),
      type,
      icon: icon ?? null,
      user_id: userId,
    })
    .select("id, name, type, icon, user_id, created_at")
    .single();

  if (error) {
    console.error("Ошибка создания категории:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return data;
});
