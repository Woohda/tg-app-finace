/**
 * @module server/utils/botHandlers
 * @fileoverview Обработчики команд и сообщений для Telegram-бота.
 * @description
 * Реализует парсинг текстовых сообщений от пользователей Telegram и обработку Callback-кнопок.
 * Позволяет пользователям добавлять расходы прямо из мессенджера с поддержкой целых и дробных сумм.
 * ---
 * ### Логика работы:
 * 1. `Text Message`: Парсит регулярными выражениями текст (Сумма + Категория или Категория + Сумма) с поддержкой запятой и двух знаков.
 * 2. `Category Matching`: Ищет совпадение по названию категории в БД. Если совпадений много — предлагает уточнить кнопками (Callback).
 * 3. `Insertion`: Добавляет транзакцию с локальной датой `formatDateISO()` и присылает сообщение об успехе.
 * 
 * ### Особенности:
 * - Использует `getBotSupabase()` для доступа к БД вне HTTP контекста.
 */
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getBotSupabase } from "./db";

export interface ParsedBotMessage {
  name: string;
  amount: number;
}

/**
 * Парсит текст сообщения бота для извлечения описания и суммы транзакции.
 * Поддерживает форматы:
 * - "Кофе 150" / "150 Кофе"
 * - "Кофе 150,50" / "150,50 Кофе" (две цифры после запятой)
 * - "Кофе 150.50" / "150.50 Кофе"
 * - "Лента 2 500,50 руб." / "2 500,50 ₽ Лента"
 * Округляет сумму до двух знаков после запятой.
 */
export function parseBotMessage(text: string): ParsedBotMessage | null {
  const cleanText = text.trim();
  if (!cleanText || cleanText.startsWith("/")) return null;

  const amountPattern = `(?:[+-]?(?:\\d{1,3}(?:\\s\\d{3})+|\\d+)(?:[.,]\\d+)?|[.,]\\d+)`;
  const currencyPattern = `(?:₽|руб(?:ль|ля|лей|\\.)?|р(?=[\\s.]|$))`;

  const textFirstRegex = new RegExp(
    `^(.+?)\\s+(${amountPattern})\\s*${currencyPattern}?$`,
    "i",
  );
  const amountFirstRegex = new RegExp(
    `^(${amountPattern})\\s*${currencyPattern}?\\s+(.+)$`,
    "i",
  );

  let rawName: string | undefined;
  let rawAmountStr: string | undefined;

  const matchTextFirst = cleanText.match(textFirstRegex);
  if (matchTextFirst) {
    rawName = matchTextFirst[1];
    rawAmountStr = matchTextFirst[2];
  } else {
    const matchAmountFirst = cleanText.match(amountFirstRegex);
    if (matchAmountFirst) {
      rawAmountStr = matchAmountFirst[1];
      rawName = matchAmountFirst[2];
    }
  }

  if (!rawName || !rawAmountStr) return null;

  const normalizedAmountStr = rawAmountStr.replace(/\s+/g, "").replace(",", ".");
  const parsedNum = parseFloat(normalizedAmountStr);

  if (isNaN(parsedNum) || !Number.isFinite(parsedNum)) return null;

  const amount = Math.round(Math.abs(parsedNum) * 100) / 100;
  if (amount <= 0) return null;

  const name = capitalizeFirstLetter(rawName.trim());
  if (!name) return null;

  return { name, amount };
}

export async function handleBotTextMessage(ctx: Context) {
  if (!ctx.message || !ctx.message.text) return;
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;

  const parsed = parseBotMessage(text);
  if (!parsed) {
    await ctx.reply(
      "Пожалуйста, укажите описание и сумму.\nПример: Лента 2000 или Кофе 150,50",
    );
    return;
  }

  const { name, amount } = parsed;
  const telegramId = ctx.from!.id;

  const supabase = getBotSupabase();
  
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  if (!user) {
    await ctx.reply("Пожалуйста, сначала откройте приложение (кнопка 'Меню' слева внизу), чтобы я вас запомнил!");
    return;
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id);

  if (!categories || categories.length === 0) {
    await ctx.reply("У вас еще нет категорий. Откройте приложение и добавьте их!");
    return;
  }

  let matchedCategory = categories.find(c => c.name.toLowerCase() === name.toLowerCase());

  if (!matchedCategory) {
    const { data: pastTx } = await supabase
      .from("transactions")
      .select("category_id")
      .eq("user_id", user.id)
      .ilike("name", name)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (pastTx) {
      matchedCategory = categories.find(c => c.id === pastTx.category_id);
    }
  }

  if (matchedCategory) {
    const type = matchedCategory.type;
    const date = formatDateISO();
    const formattedName = capitalizeFirstLetter(name);

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount,
      name: formattedName,
      category_id: matchedCategory.id,
      type,
      date,
    });

    if (error) {
      console.error("Insert error:", error);
      await ctx.reply("Произошла ошибка при сохранении транзакции.");
      return;
    }

    const typeLabel = type === "income" ? "доход" : "расход";
    await ctx.reply(
      `✅ Сохранен ${typeLabel}:\n${formattedName} (${matchedCategory.name}) — ${formatBotAmount(amount)}`,
    );
    return;
  }

  const keyboard = new InlineKeyboard();
  let col = 0;
  for (const cat of categories) {
    keyboard.text(cat.name, `cat|${amount}|${cat.id}`);
    col++;
    if (col % 2 === 0) keyboard.row();
  }
  
  await ctx.reply(`Я не знаю категорию для «${name}».\nПожалуйста, выберите подходящую из списка ниже:`, {
    reply_to_message_id: ctx.message.message_id,
    reply_markup: keyboard
  });
}

export async function handleBotCallbackQuery(ctx: Context) {
  if (!ctx.callbackQuery || !ctx.callbackQuery.data) return;
  const data = ctx.callbackQuery.data;

  // Обработка кнопки подтверждения регулярного платежа
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

  if (!data.startsWith("cat|")) return;

  const parts = data.split("|");
  if (parts.length !== 3) return;

  const amountStr = parts[1]!;
  const categoryId = parts[2]!;
  const amount = Math.round(Math.abs(parseFloat(amountStr.replace(",", "."))) * 100) / 100;

  const telegramId = ctx.from!.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalMessageText = (ctx.callbackQuery.message as any)?.reply_to_message?.text as string | undefined;

  if (!originalMessageText) {
    await ctx.answerCallbackQuery({ text: "Ошибка: не найдено оригинальное сообщение", show_alert: true });
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
    await ctx.answerCallbackQuery({ text: "Категория не найдена", show_alert: true });
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

  await ctx.editMessageText(
    `✅ Сохранен ${typeLabel}:\n${formattedName} (${category.name}) — ${formatBotAmount(amount)}\n\n_Я запомнил эту категорию на будущее!_`,
    {
      parse_mode: "Markdown",
    },
  );
  
  await ctx.answerCallbackQuery();
}
