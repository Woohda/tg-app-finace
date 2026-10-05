/**
 * @module server/api/bot/webhook.post
 * @fileoverview Серверный обработчик входящих Webhook-запросов от Telegram Bot API.
 * @description
 * Обрабатывает POST-запросы от Telegram в продакшене (Cloudflare Pages/Workers).
 * ---
 * ### Логика работы:
 * 1. Считывает тело входящего запроса (Update объект от Telegram) через `readBody(event)`.
 * 2. Передает Update объект на обработку в инстанс grammY бота (`bot.handleUpdate(update)`).
 * 3. Возвращает статус 200 OK (`{ ok: true }`), подтверждая Telegram получение запроса.
 *
 * ### Ошибки:
 * - Ошибки перехватываются, чтобы Telegram не спамил повторными запросами при разовых сбоях.
 *
 * ### Безопасность и архитектура:
 * - Полностью совместимо с Cloudflare Workers (Edge Runtime).
 */
import { getBot, getWebhookSecretToken } from "~~/server/utils/bot";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig(event);
    const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error(
        "[Telegram Webhook Error] Токен бота не найден в конфигурации!",
      );
      return { ok: false, error: "Missing token" };
    }

    // Обязательная проверка подлинности вебхука Telegram через криптографический secret_token
    const incomingSecret = getHeader(event, "x-telegram-bot-api-secret-token");
    const expectedSecret = await getWebhookSecretToken(token);

    if (!incomingSecret || incomingSecret !== expectedSecret) {
      console.warn(
        "[Telegram Webhook Security] Отклонён неавторизованный запрос к вебхуку (неверный или отсутствующий secret_token)",
      );
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized: Invalid or missing webhook secret token",
      });
    }

    const update = await readBody(event);
    if (!update) {
      return { ok: true };
    }

    const botInstance = getBot(token);
    if (!botInstance.isInited()) {
      try {
        await botInstance.init();
      } catch (initErr) {
        console.warn("[Telegram Webhook] bot.init() warning:", initErr);
      }
    }
    await botInstance.handleUpdate(update);
  } catch (error: unknown) {
    console.error("[Telegram Webhook Error]", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { ok: false, error: errorMessage };
  }
  return { ok: true };
});
