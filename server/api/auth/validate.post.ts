/**
 * @module server/api/auth/validate.post
 * @fileoverview Серверный обработчик маршрута для аутентификации Telegram пользователя.
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
 * - 400 Bad Request — если `initData` отсутствует или имеет неверный формат.
 * - 401 Unauthorized — если криптографическая подпись от Telegram недействительна.
 * - 500 Internal Server Error — если ошибка конфигурации сервера или базы данных.
 *
 * ### Примечания:
 * - Это единственный публичный эндпоинт, который не требует проверки JWT.
 * - Вся коммуникация с БД происходит от имени администратора (`serverSupabaseServiceRole`).
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "../../../app/types/database.types";

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

  if (botToken === "12345:mock_token") {
    console.warn(
      "ВНИМАНИЕ: Используется тестовый токен, валидация подписи пропущена!",
    );
  } else {
    const isValid = await verifyTelegramWebAppData(initData, botToken);
    if (!isValid) {
      throw createError({
        statusCode: 401,
        statusMessage: "Неверная подпись Telegram (данные подделаны)",
      });
    }
  }

  const urlParams = new URLSearchParams(initData);
  const userString = urlParams.get("user");

  if (!userString) {
    throw createError({
      statusCode: 400,
      statusMessage: "Данные пользователя отсутствуют в initData",
    });
  }

  const tgUser = JSON.parse(userString);
  const telegramId = tgUser.id;
  const username = tgUser.username || null;

  const supabase = serverSupabaseServiceRole<Database>(event);

  const response = await supabase
    .from("users")
    .select("id, telegram_id, username")
    .eq("telegram_id", telegramId)
    .single();

  let user = response.data;
  const fetchError = response.error;

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Ошибка БД при поиске пользователя:", fetchError);
    throw createError({ statusCode: 500, statusMessage: "Ошибка базы данных" });
  }

  if (!user) {
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({ telegram_id: telegramId, username })
      .select("id, telegram_id, username")
      .single();

    if (insertError || !newUser) {
      console.error("Ошибка создания пользователя:", insertError);
      throw createError({
        statusCode: 500,
        statusMessage: "Не удалось создать пользователя",
      });
    }
    user = newUser;
  }

  const token = await generateJWT(user.id, jwtSecret);

  return {
    token,
    user,
  };
});
