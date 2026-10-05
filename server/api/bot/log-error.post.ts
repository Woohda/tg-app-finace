/**
 * @module server/api/bot/log-error.post
 * @fileoverview Серверный обработчик логирования фронтенд-ошибок в Telegram администратора.
 * @description
 * Принимает ошибки от клиентского обработчика `onErrorCaptured` / `window.onerror`.
 * Содержит защиту от флуда и спама:
 * 1. Ограничение частоты (Throttling): не более 5 сообщений в минуту на инстанс.
 * 2. Фильтрация пустых браузерных ошибок Script error.
 * 3. Санитизация и экранирование HTML-тегов для предотвращения падений Telegram парсера.
 */
import { getBot } from "~~/server/utils/bot";
import { escapeHtml } from "~~/server/utils/format";

const MAX_ERRORS_PER_MINUTE = 5;
const errorTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  while (errorTimestamps.length > 0 && now - errorTimestamps[0]! > 60_000) {
    errorTimestamps.shift();
  }
  if (errorTimestamps.length >= MAX_ERRORS_PER_MINUTE) {
    return true;
  }
  errorTimestamps.push(now);
  return false;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const adminTgId = config.adminTgId;

  if (!adminTgId) {
    console.warn(
      "ADMIN_TG_ID не задан в .env, логгирование в Telegram пропущено",
    );
    return { success: false, reason: "ADMIN_TG_ID not configured" };
  }

  try {
    const body = await readBody(event);
    if (!body || typeof body !== "object") {
      return { success: false, reason: "Invalid body" };
    }

    const { message, url, stack, userId } = body;

    // Игнорируем неинформативные анонимные браузерные ошибки Script error
    if (message && String(message).includes("Script error") && !stack) {
      return { success: true, ignored: true };
    }

    // Защита от спама и DoS-атак на бота Telegram
    if (isRateLimited()) {
      console.warn(
        "[Error Logger Throttled] Превышен лимит отправки ошибок в Telegram (максимум 5 в минуту)",
      );
      return { success: true, throttled: true };
    }

    // Экранируем и ограничиваем длину полей во избежание сбоев парсинга Telegram HTML и DoS
    const cleanUserId = escapeHtml(String(userId || "Unknown").slice(0, 100));
    const cleanUrl = escapeHtml(String(url || "Unknown").slice(0, 200));
    const cleanMessage = escapeHtml(
      String(message || "Unknown error").slice(0, 500),
    );
    const cleanStack = escapeHtml(String(stack || "").slice(0, 2000));

    const bot = getBot(config.telegramBotToken);

    const errorMsg = `
🚨 <b>Фронтенд Ошибка</b>
<b>User:</b> <code>${cleanUserId}</code>
<b>URL:</b> ${cleanUrl}
<b>Message:</b> <code>${cleanMessage}</code>

<b>Stack:</b>
<pre>${cleanStack}</pre>
    `.trim();

    await bot.api.sendMessage(adminTgId, errorMsg, { parse_mode: "HTML" });

    return { success: true };
  } catch (err) {
    console.error("Ошибка при отправке лога в Telegram:", err);
    return { success: false };
  }
});
