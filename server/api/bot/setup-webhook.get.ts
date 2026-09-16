/**
 * @module server/api/bot/setup-webhook.get
 * @fileoverview Служебный эндпоинт для регистрации вебхука в Telegram Bot API.
 * @description
 * Поскольку api.telegram.org может быть заблокирован локальными провайдерами,
 * этот эндпоинт выполняется на серверах Cloudflare и сам регистрирует вебхук в Telegram.
 * ---
 * ### Логика работы:
 * 1. Читает токен бота и URL проекта из конфигурации.
 * 2. Отправляет GET-запрос к API Telegram (`setWebhook`).
 * 3. Возвращает ответ Telegram.
 * 
 * ### Ошибки:
 * - `500 Internal Server Error` — если Telegram не ответил или вернул ошибку.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const action = query.action || "set";

  const config = useRuntimeConfig(event);
  const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const rawAppUrl = config.webAppUrl || process.env.WEB_APP_URL || "https://tg-app-finace.pages.dev";

  if (!token) {
    return {
      ok: false,
      error: "TELEGRAM_BOT_TOKEN не задан в переменных окружения",
    };
  }

  const appUrl = rawAppUrl.startsWith("http") ? rawAppUrl : `https://${rawAppUrl}`;
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/bot/webhook`;

  try {
    let telegramResponse: unknown = null;

    if (action === "delete") {
      // Удаляем вебхук для включения локального режима Long Polling (bun run dev)
      telegramResponse = await $fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    } else {
      // Устанавливаем вебхук для продакшена (Cloudflare)
      telegramResponse = await $fetch(
        `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
      );
    }

    const webhookInfo = await $fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).catch(() => null);

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
