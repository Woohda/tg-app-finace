/**
 * @module server/utils/format
 * @fileoverview Серверные утилиты форматирования строковых и числовых данных.
 * @description
 * Предоставляет функции для нормализации пользовательского ввода на сервере,
 * в том числе капитализацию первой буквы для категорий и транзакций,
 * а также форматирование денежных сумм для сообщений Telegram-бота.
 * ---
 * ### Логика работы:
 * 1. `capitalizeFirstLetter`: переводит первый юникод-символ в верхний регистр.
 * 2. `formatBotAmount`: форматирует сумму в рубли с поддержкой копеек (две цифры после запятой).
 */

/**
 * Преобразует первый символ строки в верхний регистр (с заглавной буквы).
 * Безопасно обрабатывает пустые значения, пробелы и юникод (кириллицу, латиницу).
 */
export function capitalizeFirstLetter(str: string): string;
export function capitalizeFirstLetter(str: null): null;
export function capitalizeFirstLetter(str: undefined): undefined;
export function capitalizeFirstLetter(str?: string | null): string | null | undefined;
export function capitalizeFirstLetter(str?: string | null): string | null | undefined {
  if (str === null) return null;
  if (str === undefined) return undefined;
  const trimmed = str.trim();
  if (!trimmed) return "";
  const chars = Array.from(trimmed);
  chars[0] = chars[0]!.toUpperCase();
  return chars.join("");
}

/**
 * Форматирует денежную сумму для сообщений Telegram-бота.
 * Если сумма целая, выводит без копеек (например, 2 500 ₽).
 * Если сумма имеет дробную часть, выводит ровно с двумя знаками после запятой (например, 150,50 ₽).
 */
export function formatBotAmount(amount: number): string {
  const isInt = Number.isInteger(amount);
  return (
    new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: isInt ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount) + " ₽"
  );
}
