import { getBot } from "~~/server/utils/bot";

const escapeHtml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
