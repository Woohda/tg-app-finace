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

let botInstance: Bot | null = null;
let configuredToken: string | null = null;

/**
 * Получить валидный URL для кнопки Web App
 */
function getWebAppUrl(): string {
  const isDev = import.meta.dev;
  let rawUrl =
    (isDev && process.env.DEV_APP_URL) ||
    process.env.WEB_APP_URL ||
    "https://tg-app-finace.pages.dev";

  // Telegram требует обязательного наличия HTTPS для Web App.
  // Если указан локальный http (например, http://localhost:3000), 
  // используем продакшен URL в качестве фолбэка, чтобы бот не падал с ошибкой 400.
  if (rawUrl.startsWith("http://")) {
    console.warn(`⚠️ [Telegram Bot] DEV_APP_URL ${rawUrl} использует HTTP, но Telegram требует HTTPS. Использую фолбэк на продакшен URL.`);
    rawUrl = process.env.WEB_APP_URL || "https://tg-app-finace.pages.dev";
  }

  if (rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  return `https://${rawUrl}`;
}

/**
 * Фабрика инстанса бота с поддержкой динамического runtimeConfig в Cloudflare Workers
 */
export function getBot(customToken?: string): Bot {
  let token = customToken;

  if (!token) {
    try {
      token = useRuntimeConfig().telegramBotToken;
    } catch {
      // Игнорируем ошибку контекста вне запроса
    }
  }

  if (!token) {
    token = process.env.TELEGRAM_BOT_TOKEN || "";
  }

  // Если инстанс уже настроен с актуальным токеном — переиспользуем
  if (botInstance && configuredToken === token && token !== "") {
    return botInstance;
  }

  const newBot = new Bot(token);

  // Базовая обработка команды /start
  newBot.command("start", async (ctx) => {
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

  // Глобальный обработчик ошибок
  newBot.catch((err) => {
    console.error("❌ [Telegram Bot Error]", err.message || err);
  });

  botInstance = newBot;
  configuredToken = token;
  return newBot;
}

// Экспорт по умолчанию
export const bot = getBot();
