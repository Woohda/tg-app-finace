/**
 * @module server/utils/botHandlers
 * @fileoverview Обработчики команд и сообщений для Telegram-бота.
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
