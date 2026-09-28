/**
 * @module server/utils/botCommands
 * @fileoverview Обработчики команд Telegram-бота (/web и другие).
 * @description
 * Содержит специализированные обработчики команд для взаимодействия с пользователем вне Mini App.
 * Включает генерацию персональных одноразовых ссылок для входа на iPhone (Safari / PWA).
 */
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getBotSupabase } from "./db";
import { generateLoginTicket } from "./auth";

/**
 * Обработчик команды /web для генерации ссылки входа в Safari / PWA на iPhone.
 * Создает подписанный одноразовый токен со сроком жизни 10 минут.
 */
export async function handleWebLoginCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const supabase = getBotSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  if (!user) {
    await ctx.reply(
      "Сначала откройте приложение через кнопку «FINO» внизу, чтобы активировать аккаунт! 🐶",
    );
    return;
  }

  let jwtSecret: string | undefined;
  try {
    jwtSecret = useRuntimeConfig().jwtSecret;
  } catch {
    // Вне HTTP-контекста Nitro берем из process.env
  }
  if (!jwtSecret) {
    jwtSecret = process.env.JWT_SECRET;
  }

  if (!jwtSecret) {
    await ctx.reply("Произошла ошибка конфигурации сервера (JWT).");
    return;
  }

  const ticket = await generateLoginTicket(user.id, jwtSecret);
  const rawUrl = process.env.WEB_APP_URL || "https://tg-app-finace.pages.dev";
  const cleanBase = rawUrl.startsWith("http")
    ? rawUrl.replace(/\/+$/, "")
    : `https://${rawUrl.replace(/\/+$/, "")}`;
  const loginUrl = `${cleanBase}/login?ticket=${encodeURIComponent(ticket)}`;

  const keyboard = new InlineKeyboard().url("🚀 Открыть в Safari", loginUrl);

  await ctx.reply(
    `📲 <b>Вход в FINO для iPhone (Safari / PWA)</b>\n\n` +
      `Нажмите на кнопку ниже, чтобы открыть приложение в Safari без ввода пароля:\n\n` +
      `💡 <b>Как добавить на экран «Домой»:</b>\n` +
      `1. Откройте ссылку в браузере Safari.\n` +
      `2. Нажмите кнопку <b>«Поделиться»</b> ⎋ внизу экрана.\n` +
      `3. Выберите пункт <b>«На экран "Домой"»</b> ➕.\n\n` +
      `⏳ <i>Ссылка персональная и действует 10 минут.</i>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    },
  );
}
