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

export { capitalizeFirstLetter } from "../../app/utils/format";

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

/**
 * Экранирует спецсимволы HTML для безопасной отправки сообщений в Telegram Bot API.
 */
export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
