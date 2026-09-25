/**
 * @module server/api/bot/setup-webhook.get
 * @fileoverview Служебный защищенный эндпоинт для регистрации вебхука в Telegram Bot API.
 * @description
 * Регистрирует или удаляет вебхук бота на серверах Telegram.
 * Доступ защищен токеном бота (`TELEGRAM_BOT_TOKEN`).
 * ---
 * ### Логика работы:
 * 1. Проверяет авторизацию: заголовок `Authorization: Bearer <TELEGRAM_BOT_TOKEN>` или query `?secret=<TELEGRAM_BOT_TOKEN>`.
 * 2. Читает токен бота и URL проекта из конфигурации.
 * 3. Отправляет запрос к API Telegram (`setWebhook` или `deleteWebhook`).
 * 4. Возвращает ответ Telegram и текущую информацию о вебхуке (`getWebhookInfo`).
 *
 * ### Ошибки:
 * - `401 Unauthorized` — если токен не передан или неверен.
 * - `500 Internal Server Error` — если Telegram не ответил или вернул ошибку.
 *
 * ### Безопасность:
 * - Эндпоинт закрыт от публичного несанкционированного доступа для предотвращения DoS-атак на бота.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return {
      ok: false,
      error: "TELEGRAM_BOT_TOKEN не задан в переменных окружения",
    };
  }

  const authHeader = getHeader(event, "authorization");
  const query = getQuery(event);
  const querySecret = typeof query.secret === "string" ? query.secret.trim() : undefined;
  const providedSecret =
    authHeader?.replace(/^Bearer\s+/i, "").trim() || querySecret;

  if (providedSecret !== token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized: Неверный или отсутствующий токен бота",
    });
  }

  const action = query.action || "set";
  const rawAppUrl =
    config.webAppUrl ||
    process.env.WEB_APP_URL ||
    "https://tg-app-finace.pages.dev";

  const appUrl = rawAppUrl.startsWith("http")
    ? rawAppUrl
    : `https://${rawAppUrl}`;
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/bot/webhook`;

  try {
    let telegramResponse: unknown = null;

    if (action === "delete") {
      // Удаляем вебхук для включения локального режима Long Polling (bun run dev)
      telegramResponse = await $fetch(
        `https://api.telegram.org/bot${token}/deleteWebhook`,
      );
    } else {
      // Устанавливаем вебхук для продакшена (Cloudflare)
      telegramResponse = await $fetch(
        `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
      );
    }

    const webhookInfo = await $fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
    ).catch(() => null);

    return {
      success: true,
      action,
      webhookUrl: action === "delete" ? null : webhookUrl,
      telegramResponse,
      webhookInfo,
    };
  } catch (error: unknown) {
    const err = error as { data?: unknown; message?: string };
    return {
      success: false,
      action,
      error: err.data || err.message,
    };
  }
});
