/**
 * @module server/plugins/bot.dev
 * @fileoverview Плагин Nitro для локальной разработки Telegram-бота (Long Polling).
 * @description
 * Автоматически стартует Long Polling режим grammY при локальном запуске сервера разработки.
 * ---
 * ### Логика работы:
 * 1. Проверяет флаг `import.meta.dev` и наличие переменной `TELEGRAM_BOT_TOKEN`.
 * 2. Если оба условия выполнены, вызывает `bot.start()` с обработчиком события запуска `onStart`.
 * 3. Логирует имя бота при успешном подключении и перехватывает ошибки.
 *
 * ### Примечания:
 * - Выполняется только локально (`bun run dev`). В продакшене (Cloudflare) не активен.
 */
import { bot } from "../utils/bot";

export default defineNitroPlugin((_nitroApp) => {
  if (import.meta.dev && process.env.TELEGRAM_BOT_TOKEN) {
    bot
      .start({
        onStart(botInfo) {
          console.log(
            `[Telegram Bot] Включен режим Long Polling. Бот @${botInfo.username} запущен!`,
          );
        },
      })
      .catch((err) => {
        console.error("[Telegram Bot] Ошибка запуска:", err);
      });
  }
});
