/**
 * @module server/plugins/bot
 * @fileoverview Плагин Nitro для локальной разработки Telegram-бота (Long Polling).
 * @description
 * Автоматически стартует Long Polling режим grammY при локальном запуске сервера разработки.
 * ---
 * ### Логика работы:
 * 1. Проверяет флаг `import.meta.dev` и наличие переменной `telegramBotToken`.
 * 2. Если оба условия выполнены, вызывает `bot.start()` с обработчиком события запуска `onStart`.
 * 3. Логирует имя бота при успешном подключении и перехватывает ошибки.
 *
 * ### Примечания:
 * - Выполняется только локально (`bun run dev`). В продакшене (Cloudflare) не активен.
 */
import { getBot } from "../utils/bot";

export default defineNitroPlugin((_nitroApp) => {
  if (!import.meta.dev) return;

  const config = useRuntimeConfig();
  const token = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn("⚠️ [Telegram Bot] TELEGRAM_BOT_TOKEN не найден в .env, Long Polling не запущен.");
    return;
  }

  const bot = getBot(token);

  bot
    .start({
      onStart(botInfo) {
        console.log(
          `\n🚀 [Telegram Bot] Включен режим Long Polling! Бот @${botInfo.username} слушает сообщения...\n`,
        );
      },
    })
    .catch((err: unknown) => {
      const error = err as { message?: string; error_code?: number };
      console.error("❌ [Telegram Bot] Ошибка запуска Long Polling:", error.message || error);
    });
});
