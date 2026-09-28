/**
 * @module server/utils/botMessages
 * @fileoverview Обработка текстовых сообщений Telegram для добавления транзакций.
 * @description
 * Обрабатывает естественный текст от пользователя («Кофе 150», «2000 Лента»).
 * Находит категорию (по прямому совпадению или истории прошлых транзакций)
 * либо формирует инлайн-кнопки для выбора категории вручную.
 * ---
 * ### Логика работы:
 * 1. Валидирует и парсит текст через `parseBotMessage`.
 * 2. Проверяет регистрацию пользователя в БД по `telegram_id`.
 * 3. Ищет категорию: сначала по точному имени, затем по последней операции с таким же названием.
 * 4. При успехе — сохраняет операцию и подтверждает пользователю.
 * 5. При отсутствии категории — отправляет Inline-клавиатуру для выбора.
 */
import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { getBotSupabase } from "./db";
import { parseBotMessage } from "./botParser";

/**
 * Обрабатывает входящее текстовое сообщение пользователя Telegram.
 * Пытается распознать операцию расхода или дохода и записать её в базу.
 */
export async function handleBotTextMessage(ctx: Context): Promise<void> {
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
      "Пожалуйста, сначала откройте приложение (кнопка 'Меню' слева внизу), чтобы я вас запомнил!",
    );
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

  let matchedCategory = categories.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );

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
      matchedCategory = categories.find((c) => c.id === pastTx.category_id);
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

  await ctx.reply(
    `Я не знаю категорию для «${name}».\nПожалуйста, выберите подходящую из списка ниже:`,
    {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: keyboard,
    },
  );
}
