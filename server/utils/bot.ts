/**
 * @module server/utils/bot
 * @fileoverview Инициализация Telegram-бота и регистрация команд (Grammy).
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
      `*Как записывать траты текстом:*\n` +
        `Просто отправь мне описание и сумму\n` +
        `Например: Лента 2500, Зарплата 100000, Коммуналка 5000.\n` +
        `Я сохраню операцию и сам подберу категорию.\n\n` +
        `Если я сталкиваюсь с таким описанием впервые, я предложу выбрать категорию из списка и запомню твой выбор на будущее! 🐶`,
      { parse_mode: "Markdown" },
    );
    await ctx.reply(
      `*Возможности Web-приложения:*\n` +
        `📸 *Сканирование чеков:* прикрепи фото чека, и наш ИИ сам распознает все позиции.\n` +
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
