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
 * ### Зависимости:
 * - `requireAuth` из `~/server/utils/requireAuth`
 * - `serverSupabaseServiceRole` из `#supabase/server`
 * - `Database` из `~/app/types/database.types`
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "../../../app/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);

  const body = await readBody(event);
  const { name, type, icon } = body ?? {};

  if (!name || typeof name !== "string" || name.trim() === "") {
    throw createError({
      statusCode: 400,
      statusMessage: "Поле 'name' обязательно",
    });
  }

  if (type !== "expense" && type !== "income") {
    throw createError({
      statusCode: 400,
      statusMessage: "Поле 'type' должно быть 'expense' или 'income'",
    });
  }

  const supabase = serverSupabaseServiceRole<Database>(event);

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
