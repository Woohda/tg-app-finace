/**
 * @module server/api/cron/reminders.get
 * @fileoverview Крон-эндпоинт для отправки напоминаний о регулярных платежах в Telegram.
 * @description
 * Проверяет активные регулярные платежи и отправляет сообщения пользователям:
 * - За 3 дня до списания: информационное напоминание.
 * - За 1 день до списания: предупреждающее напоминание.
 * - В день списания: вопрос «Вы внесли платёж?» с кнопкой быстрой записи в расходы.
 */
import { InlineKeyboard } from "grammy";
import { getBot } from "~~/server/utils/bot";
import { getBotSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const botToken = config.telegramBotToken;

  if (!botToken) {
    throw createError({
      statusCode: 500,
      statusMessage: "TELEGRAM_BOT_TOKEN не настроен",
    });
  }

  const supabase = getBotSupabase();
  const bot = getBot(botToken);

  // Вычисляем текущие контрольные даты
  const now = new Date();
  const todayDay = now.getDate();

  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowDay = tomorrow.getDate();

  const in3Days = new Date(now.getTime() + 3 * 86400000);
  const in3DaysDay = in3Days.getDate();

  // Количество дней в текущем месяце (для компенсации 28/29/30/31 чисел)
  const daysInCurrentMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const isEndOfMonth = todayDay === daysInCurrentMonth;

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
    const isDueToday =
      subDay === todayDay || (isEndOfMonth && subDay > daysInCurrentMonth);

    if (isDueToday) {
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
    if (subDay === tomorrowDay) {
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
    if (subDay === in3DaysDay) {
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
