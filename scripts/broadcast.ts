/**
 * @module scripts/broadcast
 * @fileoverview Скрипт для массовой рассылки сообщений через Telegram-бота.
 *
 * @description
 * Используется для административной рассылки обновлений или новостей всем
 * пользователям, зарегистрированным в базе данных (Supabase).
 *
 * ### Логика работы:
 * 1. Получает список пользователей из БД.
 * 2. Отправляет каждому пользователю сообщение через экземпляр `Bot` (Grammy).
 */
import { Bot } from "grammy";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NUXT_SUPABASE_SECRET_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !TELEGRAM_BOT_TOKEN) {
  console.error("❌ Ошибка: не найдены ключи в .env");
  process.exit(1);
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

// === ВАШ ТЕКСТ РАССЫЛКИ ===
const MESSAGE = `
🚀
<b>
Привет! У нас небольшое обновление.

</b>

Теперь приложение стало еще удобнее. Заходите и проверяйте!
<a href="https://t.me/vfino_bot/app">Открыть приложение</a>`;
// ==========================

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function run() {
  console.log("⏳ Получаем список пользователей из базы данных...");

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/users?select=telegram_id`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY as string,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("❌ Ошибка получения пользователей:", errText);
    return;
  }

  const users: { telegram_id: number | null }[] = await response.json();

  if (!users || users.length === 0) {
    console.log("🤷‍♂️ В базе нет пользователей для рассылки.");
    return;
  }

  console.log(`✅ Найдено пользователей: ${users.length}`);
  console.log("🚀 Начинаем рассылку (это может занять какое-то время)...\n");

  let success = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.telegram_id) continue;

    try {
      await bot.api.sendMessage(user.telegram_id, MESSAGE, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
      success++;
      process.stdout.write(
        `\rУспешно отправлено: ${success} | Ошибок: ${failed}`,
      );
    } catch {
      // Пользователь мог заблокировать бота или удалить чат
      failed++;
    }
    await delay(50);
  }

  console.log(`\n\n🎉 Рассылка завершена!`);
  console.log(`✅ Успешно: ${success}`);
  console.log(`❌ Ошибок (бокировки/удаленные аккаунты): ${failed}`);
}

run();
