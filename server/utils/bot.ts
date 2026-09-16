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
      "Привет! 👋 Я, FINO, твой финансовый помощник.\nНажми кнопку ниже или используй кнопку «Меню», чтобы открыть приложение.\n\nТы также можешь писать мне свои расходы и доходы текстом, например:\nЛента 2000\nТакси 500\nЗарплата 150000",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Открыть приложение", web_app: { url: webAppUrl } }],
          ],
        },
      },
    );
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
