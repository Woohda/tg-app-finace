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

  let rawUrl: string | undefined;
  try {
    rawUrl = useRuntimeConfig().webAppUrl;
  } catch {
    // Вне контекста Nitro берем из process.env
  }
  if (!rawUrl) {
    rawUrl = process.env.WEB_APP_URL || "https://tg-app-finace.pages.dev";
  }
  const cleanBase = rawUrl.startsWith("http")
    ? rawUrl.replace(/\/+$/, "")
    : `https://${rawUrl.replace(/\/+$/, "")}`;

  if (!user) {
    await ctx.reply(
      "Сначала откройте приложение через кнопку «FINO» внизу, чтобы активировать аккаунт! 🐶",
      {
        reply_markup: new InlineKeyboard().webApp("🐶 Открыть FINO", cleanBase),
      },
    );
    return;
  }

  const firstName = ctx.from.first_name || null;
  const username = ctx.from.username || null;
  if (firstName || username) {
    try {
      await supabase
        .from("users")
        .update({
          ...(firstName ? { first_name: firstName } : {}),
          ...(username ? { username } : {}),
        })
        .eq("id", user.id);
    } catch {
      // Игнорируем ошибку фонового обновления
    }
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
  const loginUrl = `${cleanBase}/login?ticket=${encodeURIComponent(ticket)}`;

  const keyboard = new InlineKeyboard()
    .url("🚀 Открыть в браузере", loginUrl)
    .row()
    .copyText("📋 Скопировать ссылку", loginUrl)
    .row()
    .webApp("📱 Открыть в Telegram", cleanBase);

  await ctx.reply(
    `📲 <b>Вход в веб-версию FINO</b>\n\n` +
      `Нажмите на кнопку ниже или скопируйте ссылку, чтобы открыть её в удобном браузере (Safari / Chrome):\n\n` +
      `<code>${loginUrl}</code>\n\n` +
      `💡 <b>Как добавить на экран «Домой»:</b>\n` +
      `• <b>iPhone (Safari):</b> кнопка «Поделиться» ⎋ ➔ «На экран "Домой"» ➕\n` +
      `• <b>Android (Chrome):</b> меню ⋮ ➔ «Установить приложение» 📲\n\n` +
      `⏳ <i>Ссылка персональная и действует 10 минут.</i>`,
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    },
  );
}
