/**
 * @module server/api/cron/reminders.get
 * @fileoverview Крон-эндпоинт для отправки утренних напоминаний о регулярных платежах в Telegram
 * @description
 * Ежечасно вызываемый планировщиком эндпоинт. Для каждой активной подписки определяет локальное время
 * на устройстве пользователя и отправляет уведомление в дневное утреннее окно (11:00 - 14:00):
 * - За 3 дня: предварительное напоминание.
 * - За 1 день: предупреждающее напоминание.
 * - В день списания: сообщение с интерактивной кнопкой внесения в расходы.
 * Гарантирует идемпотентность через фиксацию `last_reminded_at` и проверку существующих транзакций.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка секретного ключа `CRON_SECRET` в заголовке `Authorization` или query-параметре `secret`.
 * 2. `Database Query`: Выборка всех активных подписок с джойном пользователей (`telegram_id`, `timezone`).
 * 3. `Timezone & Morning Window Check`: Вычисление локального времени пользователя. Если текущий час вне окна отправки (11:00–14:00) и не передан флаг `force=true` — подписка пропускается.
 * 4. `Idempotency Check`: Проверка `last_reminded_at`. Если сегодня (по местному календарю) напоминание уже отправлялось — подписка пропускается.
 * 5. `Due Check & Existing Transaction Check`: Проверка срока списания и наличия уже внесённого расхода в таблице `transactions`.
 * 6. `Notification & Update`: Отправка сообщения в Telegram и сохранение штампа `last_reminded_at`.
 *
 * ### Параметры запроса:
 * - `secret?: string` — секретный ключ авторизации вызова крона.
 * - `force?: string` — при значении `"true"` игнорирует проверку утреннего часа и отправляет напоминания немедленно (для тестирования).
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Неверный или отсутствующий CRON_SECRET.
 * - `500 Internal Server Error`: Отсутствует TELEGRAM_BOT_TOKEN или ошибка базы данных.
 *
 * ### Особенности:
 * - Использует нативный `Intl.DateTimeFormat` для безошибочного вычисления времени в часовом поясе пользователя.
 * - Содержит обратную совместимость на случай, если миграция колонок `last_reminded_at` или `timezone` еще не применена в БД.
 */
import { InlineKeyboard } from "grammy";
import { getBot } from "~~/server/utils/bot";
import { getBotSupabase } from "~~/server/utils/db";

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

  const isForce = query.force === "true" || query.test === "true";

  const botToken = config.telegramBotToken;
  if (!botToken) {
    throw createError({
      statusCode: 500,
      statusMessage: "TELEGRAM_BOT_TOKEN не настроен",
    });
  }

  const supabase = getBotSupabase();
  const bot = getBot(botToken);

  // Выбираем активные подписки с пользователями (пробуем включить timezone и last_reminded_at)
  let subscriptions: Array<{
    id: string;
    name: string;
    amount: number;
    day_of_month: number;
    user_id: string;
    category_id: string | null;
    last_reminded_at?: string | null;
    users?:
      | { telegram_id: number; timezone?: string | null }
      | Array<{ telegram_id: number; timezone?: string | null }>
      | null;
  }> | null;

  let hasLastRemindedColumn = true;

  const fullQuery = await supabase
    .from("subscriptions")
    .select(`
      id,
      name,
      amount,
      day_of_month,
      user_id,
      category_id,
      last_reminded_at,
      users (
        telegram_id,
        timezone
      )
    `)
    .eq("is_active", true);

  if (fullQuery.error) {
    hasLastRemindedColumn = false;

    const fallbackQuery = await supabase
      .from("subscriptions")
      .select(`
        id,
        name,
        amount,
        day_of_month,
        user_id,
        category_id,
        users (
          telegram_id
        )
      `)
      .eq("is_active", true);

    if (fallbackQuery.error) {
      console.error("Ошибка выборки подписок для крона:", fallbackQuery.error);
      throw createError({
        statusCode: 500,
        statusMessage: "Ошибка базы данных",
      });
    }

    subscriptions = fallbackQuery.data;
  } else {
    subscriptions = fullQuery.data;
  }

  let sentToday = 0;
  let sentTomorrow = 0;
  let sentIn3Days = 0;
  let skippedOutsideMorning = 0;
  let skippedIdempotent = 0;
  let skippedAlreadyPaid = 0;

  for (const sub of subscriptions || []) {
    const rawUser = Array.isArray(sub.users) ? sub.users[0] : sub.users;
    const telegramId = rawUser?.telegram_id;

    if (!telegramId) continue;

    // Часовой пояс пользователя (по умолчанию Europe/Moscow)
    const userTz = rawUser?.timezone || "Europe/Moscow";

    // Локальное время и дата на устройстве пользователя
    const userLocalNow = getUserLocalDate(userTz);
    const userLocalHour = userLocalNow.getHours();
    const userTodayISO = getUserLocalDateISO(userTz, userLocalNow);

    // 1. Проверка окна отправки (с 11:00 до 14:00) по устройству пользователя
    if (!isForce && (userLocalHour < 11 || userLocalHour >= 14)) {
      skippedOutsideMorning++;
      continue;
    }

    // 2. Идемпотентность: отправляли ли уже напоминание сегодня?
    if (!isForce && sub.last_reminded_at) {
      const lastRemindedDateISO = getUserLocalDateISO(userTz, new Date(sub.last_reminded_at));
      if (lastRemindedDateISO === userTodayISO) {
        skippedIdempotent++;
        continue;
      }
    }

    const subDay = sub.day_of_month;
    const tomorrow = addDaysSafe(userLocalNow, 1);
    const in3Days = addDaysSafe(userLocalNow, 3);

    // Функция обновления отметки последнего напоминания
    const markReminded = async () => {
      if (!hasLastRemindedColumn) return;
      try {
        await supabase
          .from("subscriptions")
          .update({ last_reminded_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (err) {
        console.warn(`Не удалось обновить last_reminded_at для подписки ${sub.id}:`, err);
      }
    };

    // 1. Проверка на сегодня (день списания)
    if (isSubscriptionDueOnDate(subDay, userLocalNow)) {
      // Проверяем, не внесен ли уже этот платёж сегодня пользователем
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", sub.user_id)
        .eq("date", userTodayISO)
        .or(`name.ilike.%${sub.name}%,category_id.eq.${sub.category_id || ""}`)
        .limit(1);

      if (existingTx && existingTx.length > 0) {
        skippedAlreadyPaid++;
        await markReminded();
        continue;
      }

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
        await markReminded();
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
        await markReminded();
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
        await markReminded();
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
    skipped: {
      outsideMorning: skippedOutsideMorning,
      idempotent: skippedIdempotent,
      alreadyPaid: skippedAlreadyPaid,
    },
  };
});
