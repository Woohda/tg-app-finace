/**
 * @module server/api/bot/setup-webhook.get
 * @fileoverview Служебный эндпоинт для регистрации вебхука в Telegram Bot API.
 * @description
 * Поскольку api.telegram.org может быть заблокирован локальными провайдерами,
 * этот эндпоинт выполняется на серверах Cloudflare и сам регистрирует вебхук в Telegram.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const rawAppUrl = config.webAppUrl || process.env.WEB_APP_URL || "https://tg-app-finace.pages.dev";

  if (!token) {
    return {
      ok: false,
      error: "TELEGRAM_BOT_TOKEN не задан в переменных окружения Cloudflare",
    };
  }

  const appUrl = rawAppUrl.startsWith("http") ? rawAppUrl : `https://${rawAppUrl}`;
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/bot/webhook`;
  const tgUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

  try {
    const telegramResponse = await $fetch(tgUrl);
    return {
      success: true,
      webhookUrl,
      telegramResponse,
    };
  } catch (error: unknown) {
    const err = error as { data?: unknown; message?: string };
    return {
      success: false,
      webhookUrl,
      error: err.data || err.message,
    };
  }
});
