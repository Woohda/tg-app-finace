/**
 * @module server/api/auth/web-login.post
 * @fileoverview Серверный обработчик входа по одноразовому тикету в Safari / PWA.
 * @description
 * Принимает криптографический тикет, проверяет его подпись и срок действия (10 минут),
 * находит пользователя в базе данных и выдает сессионный JWT токен для Web / PWA версии.
 * ---
 * ### Логика работы:
 * 1. Получение `ticket` из тела запроса.
 * 2. Верификация тикета через `verifyLoginTicket`.
 * 3. Поиск пользователя в Supabase через Service Role.
 * 4. Обновление таймзоны при необходимости.
 * 5. Генерация сессионного JWT токена через `generateJWT`.
 * 6. Возврат токена и профиля пользователя.
 *
 * ### Ошибки:
 * - `400 Bad Request`: Отсутствует тикет в запросе.
 * - `401 Unauthorized`: Недействительный или истекший тикет входа.
 * - `404 Not Found`: Пользователь не найден в базе данных.
 * - `500 Internal Server Error`: Ошибка конфигурации или базы данных.
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";
import { verifyLoginTicket, generateJWT } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const ticket = typeof body?.ticket === "string" ? body.ticket.trim() : null;

  if (!ticket) {
    throw createError({
      statusCode: 400,
      statusMessage: "Отсутствует тикет авторизации",
    });
  }

  const config = useRuntimeConfig();
  const jwtSecret = config.jwtSecret;

  if (!jwtSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка конфигурации сервера",
    });
  }

  const userId = await verifyLoginTicket(ticket, jwtSecret);
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Ссылка для входа недействительна или устарела. Запросите новую ссылку.",
    });
  }

  const supabase = serverSupabaseServiceRole<Database>(event);

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, telegram_id, username, first_name, photo_url, timezone")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    console.error("Ошибка поиска пользователя по тикету:", userError);
    throw createError({
      statusCode: 404,
      statusMessage: "Пользователь не найден",
    });
  }

  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim()
      : undefined;

  if (timezone && user.timezone !== timezone) {
    try {
      await supabase
        .from("users")
        .update({ timezone })
        .eq("id", user.id);
      user.timezone = timezone;
    } catch {
      // Игнорируем ошибку обновления таймзоны
    }
  }

  const token = await generateJWT(user.id, jwtSecret);

  return {
    token,
    user,
  };
});
