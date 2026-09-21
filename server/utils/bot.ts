/**
 * @module server/utils/bot
 * @fileoverview Инициализация Telegram-бота и регистрация команд (Grammy).
 * @description
 * Синглтон для создания и настройки инстанса `Bot` из библиотеки Grammy.
 * Регистрирует базовые команды (`/start`) и подключает обработчики (`handleBotTextMessage`).
 * ---
 * ### Логика работы:
 * 1. Создает бота с переданным токеном.
 * 2. Настраивает меню кнопки (кнопка `Open App` слева от поля ввода).
 * 3. Регистрирует текстовые и callback слушатели.
 *
 * ### Особенности:
 * - `configuredToken` используется для пересоздания инстанса при изменении токена (например, в dev-режиме).
 */
import { Bot } from "grammy";
import { handleBotTextMessage, handleBotCallbackQuery } from "./botHandlers";

let botInstance: Bot | null = null;
let configuredToken: string | null = null;

function getWebAppUrl(): string {
  const rawUrl = process.env.WEB_APP_URL || "https://tg-app-finace.pages.dev";

  if (rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  return `https://${rawUrl}`;
}

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

  if (botInstance && configuredToken === token && token !== "") {
    return botInstance;
  }

  const newBot = new Bot(token);

  newBot.command("start", async (ctx) => {
    const webAppUrl = getWebAppUrl();
    await ctx.reply(
      `Привет! 👋\n` +
        `Я, *FINO*, твой финансовый помощник.\n\n` +
        `Я помогу тебе удобно отслеживать расходы и доходы. Ты можешь использовать полноценное Web-приложение внутри Telegram или просто писать мне текстом!\n\n` +
        `Нажми кнопку "FINO", чтобы открыть приложение.`,
      { parse_mode: "Markdown" },
    );
    await ctx.reply(
      `*Как добавлять операции текстом:*\n` +
        `Просто отправь мне сообщение в формате: \`Название Сумма\` (или наоборот).\n` +
        `Например: \`Лента 2500\` или \`5000 Коммуналка\`.\n\n` +
        `🧠 *Как я подбираю категории:*\n` +
        `Если я вижу такое название впервые, я попрошу тебя выбрать категорию из списка и запомню её. В следующий раз я всё сделаю автоматически! 🐶\n\n` +
        `🛠 *Что делать, если категория выбрана неверно?*\n` +
        `Просто открой приложение и измени категорию у этой операции. Я мгновенно переучусь и больше не повторю ошибку! ✨`,
      { parse_mode: "Markdown" },
    );
    await ctx.reply(
      `*Возможности Web-приложения:*\n` +
        `📸 *Сканирование скриншотов:* прикрепи скрин банковских транзакций, и наш ИИ сам распознает все позиции.\n` +
        `📈 *Аналитика:* наглядные графики и статистика по всем категориям.\n` +
        `⚙️ *Категории:* удобная настройка и управление своими категориями.`,
      { parse_mode: "Markdown" },
    );
    await ctx.reply(`Нажми кнопку ниже, чтобы открыть приложение! 👇`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "FINO", web_app: { url: webAppUrl } }]],
      },
    });
  });

  newBot.on("message:text", handleBotTextMessage);
  newBot.on("callback_query:data", handleBotCallbackQuery);

  newBot.catch((err) => {
    console.error("❌ [Telegram Bot Error]", err.message || err);
  });

  botInstance = newBot;
  configuredToken = token;
  return newBot;
}

export const bot = getBot();
