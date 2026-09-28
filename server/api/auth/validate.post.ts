/**
 * @module server/api/auth/validate.post
 * @fileoverview Серверный обработчик POST-запроса для аутентификации Telegram пользователя
 * @description
 * Этот модуль реализует серверный endpoint, который принимает `initData` от Telegram Mini App,
 * проверяет его криптографическую подпись и выдает JWT токен для последующих запросов.
 * ---
 * ### Логика работы:
 * 1. Получение `initData` из тела POST-запроса.
 * 2. Проверка конфигурации сервера (наличие токена бота и JWT секрета).
 * 3. Валидация криптографической подписи Telegram через `verifyTelegramWebAppData`.
 * 4. Извлечение данных пользователя (ID, username) из распарсенного `initData`.
 * 5. Подключение к БД Supabase через Service Role (в обход RLS).
 * 6. Поиск пользователя по `telegram_id`. Если не найден — создание новой записи.
 * 7. Генерация stateless JWT токена через `generateJWT`.
 * 8. Возврат сгенерированного токена и базовой информации о пользователе.
 *
 * ### Ошибки:
 * - `400 Bad Request` — если `initData` отсутствует или имеет неверный формат.
 * - `401 Unauthorized` — если криптографическая подпись от Telegram недействительна.
 * - `500 Internal Server Error` — если ошибка конфигурации сервера или базы данных.
 *
 * ### Особенности:
 * - Это единственный публичный эндпоинт, который не требует проверки JWT.
 * - Вся коммуникация с БД происходит от имени администратора (`serverSupabaseServiceRole`).
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { initData } = body;

  if (!initData) {
    throw createError({
      statusCode: 400,
      statusMessage: "Отсутствуют данные авторизации (initData)",
    });
  }

  const config = useRuntimeConfig();
  const botToken = config.telegramBotToken;
  const jwtSecret = config.jwtSecret;

  if (!botToken || !jwtSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка конфигурации сервера",
    });
  }

  const isValid = await verifyTelegramWebAppData(initData, botToken);
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Неверная подпись Telegram (данные подделаны)",
    });
  }

  const urlParams = new URLSearchParams(initData);
  const userString = urlParams.get("user");

  if (!userString) {
    throw createError({
      statusCode: 400,
      statusMessage: "Данные пользователя отсутствуют в initData",
    });
  }

  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim()
      : undefined;

  const tgUser = JSON.parse(userString);
  const telegramId = tgUser.id;
  const username = tgUser.username || null;
  const firstName = tgUser.first_name || null;
  const photoUrl = tgUser.photo_url || null;

  const supabase = serverSupabaseServiceRole<Database>(event);

  const response = await supabase
    .from("users")
    .select("id, telegram_id, username, first_name, photo_url, timezone")
    .eq("telegram_id", telegramId)
    .single();

  let user = response.data;
  const fetchError = response.error;

  if (fetchError && fetchError.code !== "PGRST116") {
    // Если ошибка вызвана отсутствием новых колонок, делаем fallback выборку
    const fallbackResponse = await supabase
      .from("users")
      .select("id, telegram_id, username")
      .eq("telegram_id", telegramId)
      .single();

    if (fallbackResponse.error && fallbackResponse.error.code !== "PGRST116") {
      console.error("Ошибка БД при поиске пользователя:", fetchError);
      throw createError({ statusCode: 500, statusMessage: "Ошибка базы данных" });
    }
    user = fallbackResponse.data
      ? {
          ...fallbackResponse.data,
          first_name: null,
          photo_url: null,
          timezone: null,
        }
      : null;
  }

  if (user) {
    const updates: {
      username?: string | null;
      first_name?: string | null;
      photo_url?: string | null;
      timezone?: string | null;
    } = {};

    if (username && username !== user.username) updates.username = username;
    if (firstName && firstName !== user.first_name) updates.first_name = firstName;
    if (photoUrl && photoUrl !== user.photo_url) updates.photo_url = photoUrl;
    if (timezone && user.timezone !== timezone) updates.timezone = timezone;

    if (Object.keys(updates).length > 0) {
      try {
        await supabase
          .from("users")
          .update(updates)
          .eq("id", user.id);
        Object.assign(user, updates);
      } catch {
        // Игнорируем ошибку обновления
      }
    }
  } else {
    let newUser = null;

    try {
      const res = await supabase
        .from("users")
        .insert({
          telegram_id: telegramId,
          username,
          first_name: firstName,
          photo_url: photoUrl,
          timezone: timezone ?? null,
        })
        .select("id, telegram_id, username, first_name, photo_url, timezone")
        .single();
      newUser = res.data;
    } catch {
      // Игнорируем ошибку и пробуем базовый fallback
    }

    if (!newUser) {
      const { data: fallbackUser, error: insertError } = await supabase
        .from("users")
        .insert({ telegram_id: telegramId, username })
        .select("id, telegram_id, username")
        .single();

      if (insertError || !fallbackUser) {
        console.error("Ошибка создания пользователя:", insertError);
        throw createError({
          statusCode: 500,
          statusMessage: "Не удалось создать пользователя",
        });
      }
      newUser = {
        ...fallbackUser,
        first_name: null,
        photo_url: null,
        timezone: null,
      };
    }

    user = newUser;

    // Инициализируем стартовые категории для нового пользователя
    await seedDefaultCategories(supabase, user.id);
  }

  const token = await generateJWT(user.id, jwtSecret);

  return {
    token,
    user,
  };
});
