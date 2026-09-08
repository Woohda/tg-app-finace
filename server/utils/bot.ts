/**
 * @module server/utils/bot
 * @fileoverview Инициализация Telegram-бота и регистрация команд (Grammy).
 * @description
 * Модуль создает экземпляр бота Telegram через библиотеку grammY
 * и настраивает базовые команды диалога.
 * ---
 * ### Логика работы:
 * 1. Инициализирует инстанс `Bot` с использованием токена `TELEGRAM_BOT_TOKEN`.
 * 2. Регистрирует команду `/start`, отправляющую приветственное сообщение
 *    и Inline-кнопку для запуска Telegram Mini App.
 * 3. Динамически определяет целевой URL приложения (WEB_APP_URL или DEV_APP_URL)
 *    с автоматической нормализацией протокола HTTPS.
 *
 * ### Особенности архитектуры:
 * - Совместимо с Cloudflare Workers и Edge Runtime.
 * - В dev-режиме работает через Long Polling (плагин bot.dev.ts),
 *   а в продакшене — через Webhook (эндпоинт api/bot/webhook.post.ts).
 */
import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN || "";
export const bot = new Bot(token);

function getWebAppUrl(): string {
  const isDev = import.meta.dev;
  const rawUrl =
    (isDev && process.env.DEV_APP_URL) ||
    process.env.WEB_APP_URL ||
    process.env.DEV_APP_URL ||
    "https://tg-app-finace.pages.dev";

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  return `https://${rawUrl}`;
}

// Базовая обработка команды /start
bot.command("start", async (ctx) => {
  const webAppUrl = getWebAppUrl();

  await ctx.reply(
    "Привет! 👋 Я, FINO, твой финансовый помощник.\nНажми кнопку ниже, чтобы открыть приложение.",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "Открыть", web_app: { url: webAppUrl } }]],
      },
    },
  );
});
