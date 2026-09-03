/**
 * @module server/utils/auth
 * @fileoverview Утилиты для statusless аутентификации Telegram Mini App.
 * @description
 * Этот модуль содержит криптографические функции для проверки подлинности
 * пользователей из Telegram и генерации сессионных токенов (JWT).
 * ---
 * ### Логика работы:
 * 1. `verifyTelegramWebAppData`: Проверка `initData` через HMAC-SHA256 (сверяет подпись с токеном бота).
 * 2. `generateJWT`: Генерация сессионного JWT токена с помощью библиотеки `jose`.
 *
 * ### Особенности архитектуры:
 * - Полностью совместимо с Cloudflare Workers / Edge Runtime (без Node.js `crypto`).
 * - Для криптографии используется нативный `crypto.subtle` (Web Crypto API).
 *
 * ### Примечания:
 * - Токен бота и секрет для JWT должны передаваться из переменных окружения (runtime config).
 * - Аутентификация является полностью stateless (без хранения сессий на сервере).
 */
import { SignJWT } from "jose";

export async function verifyTelegramWebAppData(
  telegramInitData: string,
  botToken: string,
): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get("hash");
    if (!hash) return false;
    urlParams.delete("hash");
    const keys = Array.from(urlParams.keys());
    keys.sort();
    const dataCheckString = keys
      .map((key) => `${key}=${urlParams.get(key)}`)
      .join("\n");

    const encoder = new TextEncoder();

    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const botTokenKey = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(botToken),
    );

    const hmacKey = await crypto.subtle.importKey(
      "raw",
      botTokenKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      hmacKey,
      encoder.encode(dataCheckString),
    );

    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatureHex === hash;
  } catch (error) {
    console.error("Ошибка проверки Telegram initData:", error);
    return false;
  }
}

export async function generateJWT(
  userId: string,
  secret: string,
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}
