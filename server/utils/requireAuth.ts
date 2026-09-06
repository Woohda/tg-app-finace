/**
 * @module server/utils/requireAuth
 * @fileoverview Утилита валидации авторизации и извлечения пользователя из JWT токена
 * @description
 * Этот модуль проверяет заголовок Authorization в входящем HTTP-запросе, валидирует
 * криптографическую подпись JWT токена и возвращает идентификатор аутентифицированного пользователя (`userId`).
 * ---
 * ### Логика работы:
 * 1. `Header Extraction`: Извлекает заголовок `authorization` из события H3 (`event`)
 * 2. `Format Validation`: Проверяет наличие префикса `Bearer `
 * 3. `JWT Verification`: Декодирует и проверяет валидность и срок действия токена с использованием `crypto.subtle` через библиотеку `jose`
 * 4. `Identity Resolution`: Извлекает поле `sub` (UUID пользователя в БД) из полезной нагрузки токена
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Если заголовок отсутствует, не начинается с `Bearer `, токен повреждён, подделан или истёк
 *
 * ### Особенности:
 * - Полная совместимость со средой исполнения Cloudflare Workers / Edge Runtime (без Node.js `crypto`)
 * - Защита от подделки идентификатора: `userId` всегда извлекается из проверенной криптографической подписи токена
 *
 * ### Примечания:
 * - Секрет для подписи JWT извлекается из `useRuntimeConfig().jwtSecret`
 * - Используется во всех защищённых эндпоинтах `/api/*`
 *
 * ### Зависимости:
 * - `jwtVerify` из `jose`
 * - `getHeader`, `createError` из `h3` (автоимпорт Nitro)
 */
import { jwtVerify } from "jose";

export async function requireAuth(
  event: Parameters<typeof defineEventHandler>[0] extends (
    event: infer E,
  ) => unknown
    ? E
    : never,
): Promise<string> {
  const authHeader = getHeader(event, "authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Требуется авторизация",
    });
  }

  const token = authHeader.slice(7);
  const config = useRuntimeConfig();

  try {
    const secretKey = new TextEncoder().encode(config.jwtSecret);
    const { payload } = await jwtVerify(token, secretKey);

    if (!payload.sub) {
      throw new Error("Отсутствует sub в токене");
    }

    return payload.sub;
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Токен недействителен или просрочен",
    });
  }
}
