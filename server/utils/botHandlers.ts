/**
 * @module server/utils/botHandlers
 * @fileoverview Обработчики команд и сообщений для Telegram-бота.
 * @description
 * Реализует парсинг текстовых сообщений от пользователей Telegram и обработку Callback-кнопок.
 * Позволяет пользователям добавлять расходы прямо из мессенджера.
 * ---
 * ### Логика работы:
 * 1. `Text Message`: Парсит регулярными выражениями текст (Сумма + Категория или Категория + Сумма).
 * 2. `Category Matching`: Ищет совпадение по названию категории в БД. Если совпадений много — предлагает уточнить кнопками (Callback).
 * 3. `Insertion`: Добавляет транзакцию и присылает сообщение об успехе.
 * 
 * ### Особенности:
 * - Использует `getBotSupabase()` для доступа к БД вне HTTP контекста.
 */
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getBotSupabase } from "./db";

export async function handleBotTextMessage(ctx: Context) {
  if (!ctx.message || !ctx.message.text) return;
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return;

  let name: string;
  let amountStr: string;

  const matchTextFirst = text.match(/^(.+?)\s+([+-]?\d+(?:\.\d+)?)$/);
  const matchAmountFirst = text.match(/^([+-]?\d+(?:\.\d+)?)\s+(.+)$/);

  if (matchTextFirst) {
    name = matchTextFirst[1]!.trim();
    amountStr = matchTextFirst[2]!;
  } else if (matchAmountFirst) {
    amountStr = matchAmountFirst[1]!;
    name = matchAmountFirst[2]!.trim();
  } else {
    await ctx.reply("Пожалуйста, укажите описание и сумму.\nПример: Лента 2000");
    return;
  }

  const amount = Math.abs(parseFloat(amountStr));
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
    const date = new Date().toISOString().split("T")[0]!;

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount,
      name,
      category_id: matchedCategory.id,
      type,
      date
    });

    if (error) {
      console.error("Insert error:", error);
      await ctx.reply("Произошла ошибка при сохранении транзакции.");
      return;
    }

    const typeLabel = type === "income" ? "доход" : "расход";
    await ctx.reply(`✅ Сохранен ${typeLabel}:\n${name} (${matchedCategory.name}) — ${amount} ₽`);
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

    const date = new Date().toISOString().split("T")[0]!;

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: sub.user_id,
      amount: Number(sub.amount),
      name: `Платёж: ${sub.name}`,
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
        `✅ Платёж «<b>${sub.name}</b>» на сумму <b>${sub.amount} ₽</b> успешно внесён в расходы за ${date}!`,
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
  const amount = parseFloat(amountStr);

  const telegramId = ctx.from!.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalMessageText = (ctx.callbackQuery.message as any)?.reply_to_message?.text as string | undefined;

  if (!originalMessageText) {
    await ctx.answerCallbackQuery({ text: "Ошибка: не найдено оригинальное сообщение", show_alert: true });
    return;
  }

  let name: string;
  const matchTextFirst = originalMessageText.match(/^(.+?)\s+([+-]?\d+(?:\.\d+)?)$/);
  const matchAmountFirst = originalMessageText.match(/^([+-]?\d+(?:\.\d+)?)\s+(.+)$/);

  if (matchTextFirst) {
    name = matchTextFirst[1]!.trim();
  } else if (matchAmountFirst) {
    name = matchAmountFirst[2]!.trim();
  } else {
    name = "Транзакция";
  }

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

  const date = new Date().toISOString().split("T")[0]!;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount,
    name,
    category_id: categoryId,
    type: category.type,
    date
  });

  if (error) {
     console.error("Insert error:", error);
     await ctx.answerCallbackQuery({ text: "Ошибка базы данных", show_alert: true });
     return;
  }

  const typeLabel = category.type === "income" ? "доход" : "расход";
  
  await ctx.editMessageText(`✅ Сохранен ${typeLabel}:\n${name} (${category.name}) — ${amount} ₽\n\n_Я запомнил эту категорию на будущее!_`, {
    parse_mode: "Markdown"
  });
  
  await ctx.answerCallbackQuery();
}
