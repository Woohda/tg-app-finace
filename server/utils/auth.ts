/**
 * @module server/utils/auth
 * @fileoverview Утилиты для аутентификации Telegram Mini App и браузерного входа
 * @description
 * Содержит криптографические функции для проверки подлинности данных инициализации
 * Telegram WebApp, генерации сессионных JWT-токенов, а также выпуска и верификации
 * одноразовых билетов входа (login tickets).
 * ---
 * ### Логика работы:
 * 1. `verifyTelegramWebAppData`: проверка подписи `initData` через HMAC-SHA256 (сверяет подпись с токеном бота).
 * 2. `generateJWT`: создание сессионного JWT-токена пользователя через `jose`.
 * 3. `generateLoginTicket`: создание короткоживущего одноразового билета для входа через браузер.
 * 4. `verifyLoginTicket`: валидация билета и проверка защиты от повторного использования.
 * 
 * ### Особенности:
 * - Полная совместимость с Cloudflare Workers / Edge Runtime (без Node.js `crypto`).
 * - Криптография на базе нативного `crypto.subtle` (Web Crypto API).
 * - Аутентификация является полностью stateless.
 */
import { SignJWT, jwtVerify } from "jose";

export async function verifyTelegramWebAppData(
  telegramInitData: string,
  botToken: string,
): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get("hash");
    if (!hash) return false;

    // Защита от Replay-атак: проверяем свежесть данных auth_date (не старше 24 часов)
    const authDateStr = urlParams.get("auth_date");
    if (!authDateStr) return false;
    const authDate = Number(authDateStr);
    if (!Number.isFinite(authDate) || authDate <= 0) return false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds - authDate > 86400 || authDate - nowSeconds > 300) {
      console.warn("verifyTelegramWebAppData: auth_date expired or invalid:", authDate, "now:", nowSeconds);
      return false;
    }

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

    if (signatureHex.length !== hash.length) return false;
    let match = 0;
    for (let i = 0; i < signatureHex.length; i++) {
      match |= signatureHex.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    return match === 0;
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

  const iat = Math.floor(Date.now() / 1000) - 300; // Вычитаем 5 минут для компенсации рассинхронизации времени с БД

  return await new SignJWT({
    sub: userId,
    role: "authenticated",
    type: "access_token",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime("7d")
    .sign(secretKey);
}

const usedTicketJtis = new Map<string, number>();

function cleanExpiredTickets() {
  const now = Date.now();
  for (const [jti, exp] of usedTicketJtis.entries()) {
    if (exp <= now) {
      usedTicketJtis.delete(jti);
    }
  }
}

function isLoginTicketUsed(jti: string): boolean {
  cleanExpiredTickets();
  return usedTicketJtis.has(jti);
}

export function markLoginTicketUsed(jti: string, expMs = 15 * 60 * 1000): void {
  cleanExpiredTickets();
  usedTicketJtis.set(jti, Date.now() + expMs);
}

/**
 * Генерирует одноразовый короткоживущий тикет для входа через браузер Safari / PWA.
 * Срок действия: 5 минут.
 */
export async function generateLoginTicket(
  userId: string,
  secret: string,
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  const iat = Math.floor(Date.now() / 1000) - 60; // 1 минута запас на рассинхрон

  return await new SignJWT({
    sub: userId,
    type: "web_login_ticket",
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime("5m")
    .sign(secretKey);
}

/**
 * Проверяет подлинность одноразового тикета входа.
 * Возвращает { userId, jti } или null, если тикет недействителен, уже использован или просрочен.
 */
export async function verifyLoginTicket(
  ticket: string,
  secret: string,
): Promise<{ userId: string; jti: string } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(ticket, secretKey);

    if (
      payload.type !== "web_login_ticket" ||
      !payload.sub ||
      typeof payload.jti !== "string"
    ) {
      return null;
    }

    if (isLoginTicketUsed(payload.jti)) {
      console.warn("verifyLoginTicket: тикет уже был использован ранее:", payload.jti);
      return null;
    }

    return {
      userId: payload.sub as string,
      jti: payload.jti,
    };
  } catch (error) {
    console.error("Ошибка проверки тикета входа:", error);
    return null;
  }
}

