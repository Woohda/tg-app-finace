import { getBot } from "../../utils/bot";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const adminTgId = config.adminTgId;

  if (!adminTgId) {
    console.warn("ADMIN_TG_ID не задан в .env, логгирование в Telegram пропущено");
    return { success: false, reason: "ADMIN_TG_ID not configured" };
  }

  try {
    const body = await readBody(event);
    const { message, url, stack, userId } = body;

    const bot = getBot(config.telegramBotToken);

    const errorMsg = `
🚨 <b>Фронтенд Ошибка</b>
<b>User:</b> <code>${userId || 'Unknown'}</code>
<b>URL:</b> ${url || 'Unknown'}
<b>Message:</b> <code>${message || 'Unknown error'}</code>

<b>Stack:</b>
<pre>${(stack || '').substring(0, 3000)}</pre>
    `.trim();

    await bot.api.sendMessage(adminTgId, errorMsg, { parse_mode: "HTML" });

    return { success: true };
  } catch (err) {
    console.error("Ошибка при отправке лога в Telegram:", err);
    return { success: false };
  }
});
