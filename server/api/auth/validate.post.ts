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

  const supabase = serverSupabaseServiceRole<Database>(event);

  const response = await supabase
    .from("users")
    .select("id, telegram_id, username, timezone")
    .eq("telegram_id", telegramId)
    .single();

  let user = response.data;
  const fetchError = response.error;

  if (fetchError && fetchError.code !== "PGRST116") {
    // Если ошибка вызвана тем, что колонка timezone еще не добавлена, делаем fallback выборку
    const fallbackResponse = await supabase
      .from("users")
      .select("id, telegram_id, username")
      .eq("telegram_id", telegramId)
      .single();

    if (fallbackResponse.error && fallbackResponse.error.code !== "PGRST116") {
      console.error("Ошибка БД при поиске пользователя:", fetchError);
      throw createError({ statusCode: 500, statusMessage: "Ошибка базы данных" });
    }
    user = fallbackResponse.data ? { ...fallbackResponse.data, timezone: null } : null;
  }

  if (user) {
    if (timezone && user.timezone !== timezone) {
      try {
        await supabase
          .from("users")
          .update({ timezone })
          .eq("id", user.id);
        user.timezone = timezone;
      } catch {
        // Игнорируем ошибку обновления, если колонка timezone еще не создана
      }
    }
  } else {
    let newUser = null;

    if (timezone) {
      const res = await supabase
        .from("users")
        .insert({ telegram_id: telegramId, username, timezone })
        .select("id, telegram_id, username, timezone")
        .single();
      newUser = res.data;
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
      newUser = { ...fallbackUser, timezone: null };
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
