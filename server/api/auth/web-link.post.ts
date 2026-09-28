/**
 * @module server/api/auth/web-link.post
 * @fileoverview Серверный обработчик для генерации персональной ссылки входа в Safari / PWA.
 * @description
 * Позволяет аутентифицированному пользователю Mini App получить одноразовую подписанную ссылку
 * для открытия приложения во внешнем браузере Safari на iPhone.
 * ---
 * ### Логика работы:
 * 1. Проверка JWT токена через `requireAuth`.
 * 2. Генерация криптографического тикета через `generateLoginTicket`.
 * 3. Формирование ссылки с параметром `ticket`.
 * 4. Возврат URL клиенту.
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Пользователь не аутентифицирован.
 * - `500 Internal Server Error`: Ошибка конфигурации сервера.
 */
import { requireAuth } from "~~/server/utils/requireAuth";
import { generateLoginTicket } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const { userId } = await requireAuth(event);
  const config = useRuntimeConfig();

  const jwtSecret = config.jwtSecret;
  if (!jwtSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка конфигурации сервера",
    });
  }

  const ticket = await generateLoginTicket(userId, jwtSecret);

  let rawUrl =
    config.webAppUrl ||
    process.env.WEB_APP_URL ||
    "https://tg-app-finace.pages.dev";
  if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    rawUrl = `https://${rawUrl}`;
  }
  const cleanBase = rawUrl.replace(/\/+$/, "");
  const url = `${cleanBase}/login?ticket=${encodeURIComponent(ticket)}`;

  return { url };
});
