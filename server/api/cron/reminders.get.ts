/**
 * @module server/api/cron/reminders.get
 * @fileoverview Крон-эндпоинт для отправки напоминаний о регулярных платежах в Telegram.
 * @description
 * Проверяет активные регулярные платежи и отправляет сообщения пользователям:
 * - За 3 дня до списания: информационное напоминание.
 * - За 1 день до списания: предупреждающее напоминание.
 * ---
 * ### Безопасность:
 * - Эндпоинт защищен от несанкционированного вызова и DoS-спама.
 * - Требует заголовок `Authorization: Bearer <CRON_SECRET>` или query-параметр `?secret=<CRON_SECRET>`.
 */
import { addDays, getDate, getDaysInMonth, isLastDayOfMonth } from "date-fns";
import { InlineKeyboard } from "grammy";
import { getBot } from "~~/server/utils/bot";
import { getBotSupabase } from "~~/server/utils/db";

/**
 * Проверяет, приходится ли списание регулярного платежа на целевую дату.
 * Корректно компенсирует короткие месяцы (28, 29, 30 дней) для подписок на 29, 30 и 31 числа.
 */
function isSubscriptionDueOnDate(subDay: number, targetDate: Date): boolean {
  const day = getDate(targetDate);
  const daysInMonth = getDaysInMonth(targetDate);
  const isEndOfMonth = isLastDayOfMonth(targetDate);

  return subDay === day || (isEndOfMonth && subDay > daysInMonth);
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const cronSecret = config.cronSecret || process.env.CRON_SECRET;

  const authHeader = getHeader(event, "authorization");
  const query = getQuery(event);
  const querySecret = typeof query.secret === "string" ? query.secret.trim() : undefined;
  const providedSecret =
    authHeader?.replace(/^Bearer\s+/i, "").trim() || querySecret;

  if (!cronSecret || providedSecret !== cronSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized: Неверный или отсутствующий CRON_SECRET",
    });
  }

  const botToken = config.telegramBotToken;

  if (!botToken) {
    throw createError({
      statusCode: 500,
      statusMessage: "TELEGRAM_BOT_TOKEN не настроен",
    });
  }

  const supabase = getBotSupabase();
  const bot = getBot(botToken);

  // Вычисляем контрольные даты проверки (сегодня, завтра, через 3 дня)
  const now = new Date();
  const tomorrow = addDays(now, 1);
  const in3Days = addDays(now, 3);

  // Выбираем все активные подписки с привязанными telegram_id пользователей
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      name,
      amount,
      day_of_month,
      user_id,
      users (
        telegram_id
      )
    `,
    )
    .eq("is_active", true);

  if (error) {
    console.error("Ошибка выборки подписок для крона:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  let sentToday = 0;
  let sentTomorrow = 0;
  let sentIn3Days = 0;

  for (const sub of subscriptions || []) {
    const rawUser = Array.isArray(sub.users) ? sub.users[0] : sub.users;
    const telegramId = rawUser?.telegram_id;

    if (!telegramId) continue;

    const subDay = sub.day_of_month;

    // 1. Проверка на сегодня (день списания)
    if (isSubscriptionDueOnDate(subDay, now)) {
      try {
        const keyboard = new InlineKeyboard().text(
          "💸 Внести в расходы",
          `pay_sub:${sub.id}`,
        );

        await bot.api.sendMessage(
          telegramId,
          `💸 Сегодня день платежа «<b>${sub.name}</b>» на сумму <b>${sub.amount} ₽</b>.\n\nВы внесли платёж?`,
          {
            parse_mode: "HTML",
            reply_markup: keyboard,
          },
        );
        sentToday++;
      } catch (err) {
        console.error(`Ошибка отправки сообщения (сегодня) юзеру ${telegramId}:`, err);
      }
      continue;
    }

    // 2. Проверка за 1 день (завтра)
    if (isSubscriptionDueOnDate(subDay, tomorrow)) {
      try {
        await bot.api.sendMessage(
          telegramId,
          `⚠️ Напоминание: завтра регулярный платёж «<b>${sub.name}</b>» на сумму <b>${sub.amount} ₽</b>.`,
          { parse_mode: "HTML" },
        );
        sentTomorrow++;
      } catch (err) {
        console.error(`Ошибка отправки сообщения (завтра) юзеру ${telegramId}:`, err);
      }
      continue;
    }

    // 3. Проверка за 3 дня
    if (isSubscriptionDueOnDate(subDay, in3Days)) {
      try {
        await bot.api.sendMessage(
          telegramId,
          `🔔 Напоминание: через 3 дня регулярный платёж «<b>${sub.name}</b>» на сумму <b>${sub.amount} ₽</b>.`,
          { parse_mode: "HTML" },
        );
        sentIn3Days++;
      } catch (err) {
        console.error(`Ошибка отправки сообщения (за 3 дня) юзеру ${telegramId}:`, err);
      }
    }
  }

  return {
    success: true,
    processed: (subscriptions || []).length,
    sent: {
      today: sentToday,
      tomorrow: sentTomorrow,
      in3Days: sentIn3Days,
    },
  };
});
