/**
 * @module server/api/auth/dev-login.post
 * @fileoverview Dev-only endpoint для авторизации без Telegram
 * @description
 * Создаёт или находит тестового пользователя и выдаёт JWT.
 * Работает ТОЛЬКО в dev-режиме (`import.meta.dev`).
 * В production этот файл не должен попадать в бандл.
 * ---
 * ### Логика работы:
 * 1. `Check Env`: Проверяет, что сервер запущен в режиме разработки (`import.meta.dev`).
 * 2. `Supabase Role`: Подключается к БД через Service Role.
 * 3. `Upsert User`: Создает или обновляет тестового пользователя с фиксированным `telegram_id` (999999999).
 * 4. `Generate JWT`: Выдает токен для доступа к API.
 * 
 * ### Ошибки:
 * - `404 Not Found` — блокировка в продакшене.
 * - `500 Internal Server Error` — если ошибка БД.
 * 
 * ### Особенности:
 * - Только для локальной разработки, чтобы можно было тестировать API без Telegram Web App.
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";

const DEV_TELEGRAM_ID = 999999999;
const DEV_USERNAME = "dev_user";

export default defineEventHandler(async (event) => {
  // Жёсткая блокировка для production
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const config = useRuntimeConfig();
  const jwtSecret = config.jwtSecret;

  if (!jwtSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "JWT_SECRET не настроен",
    });
  }

  const supabase = serverSupabaseServiceRole<Database>(event);

  // Ищем или создаём dev-пользователя
  const { data: existing } = await supabase
    .from("users")
    .select("id, telegram_id, username")
    .eq("telegram_id", DEV_TELEGRAM_ID)
    .single();

  let user = existing;

  if (!user) {
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ telegram_id: DEV_TELEGRAM_ID, username: DEV_USERNAME })
      .select("id, telegram_id, username")
      .single();

    if (insertError || !newUser) {
      console.error("Ошибка создания dev-пользователя:", insertError);
      throw createError({
        statusCode: 500,
        statusMessage: "Не удалось создать dev-пользователя",
      });
    }
    user = newUser;
  }

  const token = await generateJWT(user.id, jwtSecret);

  console.log("[DEV AUTH] Выдан токен для dev-пользователя:", user.id);

  return { token, user };
});
