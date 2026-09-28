/**
 * @module server/utils/botParser
 * @fileoverview Парсинг текстовых сообщений Telegram для извлечения транзакций.
 * @description
 * Предоставляет чистую функцию разбора текста сообщения на название и сумму транзакции.
 * Поддерживает целые и дробные числа (с запятой или точкой), пробелы между разрядами и валютные символы.
 * ---
 * ### Логика разбора:
 * - Поддерживает форматы: «Кофе 150», «150 Кофе», «Лента 2 500,50 руб.», «2 500,50 ₽ Лента».
 * - Округляет сумму до двух знаков после запятой (копейки).
 * - Капитализирует первую букву названия для единообразия в базе данных.
 */

export interface ParsedBotMessage {
  name: string;
  amount: number;
}

/**
 * Парсит текст сообщения бота для извлечения описания и суммы транзакции.
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
