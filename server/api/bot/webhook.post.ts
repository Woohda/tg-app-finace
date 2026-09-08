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
 * ### Безопасность и архитектура:
 * - Полностью совместимо с Cloudflare Workers (Edge Runtime).
 * - Ошибки перехватываются, чтобы Telegram не спамил повторными запросами при разовых сбоях.
 */
import { getBot } from "../../utils/bot";

export default defineEventHandler(async (event) => {
  try {
    const update = await readBody(event);
    if (!update) {
      return { ok: true };
    }

    const config = useRuntimeConfig(event);
    const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error("[Telegram Webhook Error] Токен бота не найден в конфигурации!");
      return { ok: false, error: "Missing token" };
    }

    const botInstance = getBot(token);
    await botInstance.handleUpdate(update);
  } catch (error) {
    console.error("[Telegram Webhook Error]", error);
  }
  return { ok: true };
});
