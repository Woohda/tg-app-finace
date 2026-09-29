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
import {
  handleBotTextMessage,
  handleBotCallbackQuery,
  handleWebLoginCommand,
} from "./botHandlers";
import { getBotSupabase } from "./db";

let botInstance: Bot | null = null;
let configuredToken: string | null = null;

function getWebAppUrl(): string {
  const rawUrl = process.env.WEB_APP_URL || "https://tg-app-finace.pages.dev";

  if (rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  return `https://${rawUrl}`;
}

/**
 * Вычисляет или возвращает секретный токен для вебхука Telegram.
 * Использует Web Crypto API для совместимости с Cloudflare Workers / Nitro.
 */
export async function getWebhookSecretToken(
  botToken: string,
  configuredSecret?: string,
): Promise<string> {
  if (configuredSecret && configuredSecret.trim()) {
    return configuredSecret.trim();
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(`tg_webhook_secret:${botToken}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    const payload = ctx.match?.trim();

    // 1. Если перешли по диплинку авторизации /start web
    if (payload === "web") {
      await handleWebLoginCommand(ctx);
      return;
    }

    // 2. Если пользователь уже нажимал старт ранее (аккаунт существует в БД)
    const telegramId = ctx.from?.id;
    if (telegramId) {
      const supabase = getBotSupabase();
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", telegramId)
        .maybeSingle();

      if (user) {
        // Пользователь уже зарегистрирован — сразу выдаем персональный доступ к Web и приложению
        await handleWebLoginCommand(ctx);
        return;
      }
    }

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
        `Например: \`Лента 2500\` или \`Кофе 150,50\`.\n\n` +
        `🧠 *Как я подбираю категории:*\n` +
        `Если я вижу такое название впервые, я попрошу тебя выбрать категорию из списка и запомню её. В следующий раз я всё сделаю автоматически! 🐶\n\n` +
        `✏️ *Что делать, если категория выбрана неверно?*\n` +
        `Просто открой приложение и измени категорию у этой операции. Я мгновенно переучусь и больше не повторю ошибку! ✨`,
      { parse_mode: "Markdown" },
    );
    await ctx.reply(
      `*Возможности приложения:*\n` +
        `📸 *Сканирование чеков и выписок:* загрузи фото чека или скриншот выписки операций из банка — наш ИИ сам распознает все позиции и суммы.\n` +
        `💳 *Подписки и регулярные платежи:* держи под контролем сервисы и счета с напоминаниями прямо в боте.\n` +
        `📊 *Аналитика и бюджет:* интерактивная диаграмма трат, контроль лимита на месяц и финансовые отчеты.\n` +
        `🏷️ *Категории:* создавай персональные категории с иконками, а я быстро научусь распределять операции за тебя! ✨`,
      { parse_mode: "Markdown" },
    );
    await ctx.reply(`Нажми кнопку ниже, чтобы открыть приложение! 👇`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "FINO", web_app: { url: webAppUrl } }]],
      },
    });
  });

  newBot.command("web", handleWebLoginCommand);

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
