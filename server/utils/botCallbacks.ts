/**
 * @module server/utils/botCallbacks
 * @fileoverview Обработка нажатий на инлайн-кнопки (Callback Queries) в Telegram-боте.
 * @description
 * Реализует обработку двух ключевых сценариев:
 * 1. `pay_sub:<subscriptionId>` — подтверждение оплаты регулярного платежа по напоминанию.
 * 2. `cat|<amount>|<categoryId>` — ручной выбор категории для нераспознанной операции.
 * ---
 * ### Особенности:
 * - Безопасная работа с типами Grammy без использования `any`.
 * - Обновляет текст сообщения после успешной записи, предотвращая повторные нажатия.
 */
import type { Context } from "grammy";
import { getBotSupabase } from "./db";
import { parseBotMessage } from "./botParser";
import { escapeHtml } from "./format";

/**
 * Обрабатывает все callback-запросы от инлайн-кнопок бота.
 */
export async function handleBotCallbackQuery(ctx: Context): Promise<void> {
  if (!ctx.callbackQuery || !ctx.callbackQuery.data) return;
  const data = ctx.callbackQuery.data;

  // 1. Обработка кнопки подтверждения регулярного платежа (напоминания)
  if (data.startsWith("pay_sub:")) {
    const subscriptionId = data.replace("pay_sub:", "");
    const supabase = getBotSupabase();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, name, amount, category_id, user_id")
      .eq("id", subscriptionId)
      .single();

    if (!sub) {
      await ctx.answerCallbackQuery({
        text: "Регулярный платёж не найден или был удалён",
        show_alert: true,
      });
      return;
    }

    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (!user || user.id !== sub.user_id) {
      await ctx.answerCallbackQuery({
        text: "Вы не можете подтвердить чужой регулярный платёж",
        show_alert: true,
      });
      return;
    }

    let categoryId = sub.category_id;
    if (!categoryId) {
      const { data: defaultCat } = await supabase
        .from("categories")
        .select("id")
        .or(`user_id.eq.${sub.user_id},user_id.is.null`)
        .eq("type", "expense")
        .limit(1)
        .maybeSingle();

      if (defaultCat) {
        categoryId = defaultCat.id;
      }
    }

    if (!categoryId) {
      await ctx.answerCallbackQuery({
        text: "Категория для платежа не найдена",
        show_alert: true,
      });
      return;
    }

    const date = formatDateISO();
    const subName = capitalizeFirstLetter(sub.name);

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: sub.user_id,
      amount: Number(sub.amount),
      name: `Платёж: ${subName}`,
      category_id: categoryId,
      type: "expense",
      date,
    });

    if (insertError) {
      console.error("Ошибка при сохранении регулярного платежа:", insertError);
      await ctx.answerCallbackQuery({
        text: "Ошибка при внесении платежа в базу данных",
        show_alert: true,
      });
      return;
    }

    await ctx.answerCallbackQuery({ text: "Платёж внесён в расходы! 💸" });

    try {
      await ctx.editMessageText(
        `✅ Платёж «<b>${subName}</b>» на сумму <b>${formatBotAmount(Number(sub.amount))}</b> успешно внесён в расходы за ${date}!`,
        { parse_mode: "HTML" },
      );
    } catch {
      // Игнорируем ошибку редактирования, если сообщение уже изменено
    }
    return;
  }

  // 2. Обработка выбора категории для транзакции
  if (!data.startsWith("cat|")) return;

  const parts = data.split("|");
  if (parts.length !== 3) return;

  const amountStr = parts[1]!;
  const categoryId = parts[2]!;
  const amount =
    Math.round(Math.abs(parseFloat(amountStr.replace(",", "."))) * 100) / 100;

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // Извлекаем текст исходного сообщения пользователя через reply_to_message
  const message = ctx.callbackQuery.message;
  const replyTo =
    message && "reply_to_message" in message
      ? message.reply_to_message
      : undefined;
  const originalMessageText =
    replyTo && "text" in replyTo ? replyTo.text : undefined;

  if (!originalMessageText) {
    await ctx.answerCallbackQuery({
      text: "Ошибка: не найдено оригинальное сообщение",
      show_alert: true,
    });
    return;
  }

  const parsed = parseBotMessage(originalMessageText);
  const name = parsed?.name ?? "Транзакция";

  const supabase = getBotSupabase();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  if (!user) return;

  const { data: category } = await supabase
    .from("categories")
    .select("name, type")
    .eq("id", categoryId)
    .single();

  if (!category) {
    await ctx.answerCallbackQuery({
      text: "Категория не найдена",
      show_alert: true,
    });
    return;
  }

  const date = formatDateISO();
  const formattedName = capitalizeFirstLetter(name);

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount,
    name: formattedName,
    category_id: categoryId,
    type: category.type,
    date,
  });

  if (error) {
    console.error("Insert error:", error);
    await ctx.answerCallbackQuery({
      text: "Ошибка базы данных",
      show_alert: true,
    });
    return;
  }

  const typeLabel = category.type === "income" ? "доход" : "расход";
  const safeName = escapeHtml(formattedName);
  const safeCatName = escapeHtml(category.name);

  await ctx.editMessageText(
    `✅ Сохранен ${typeLabel}:\n<b>${safeName}</b> (${safeCatName}) — <b>${formatBotAmount(amount)}</b>\n\n<i>Я запомнил эту категорию на будущее!</i>`,
    {
      parse_mode: "HTML",
    },
  );

  await ctx.answerCallbackQuery();
}
