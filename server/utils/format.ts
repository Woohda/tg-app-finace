/**
 * @module server/utils/format
 * @fileoverview Серверные утилиты форматирования строковых данных.
 * @description
 * Предоставляет функции для нормализации пользовательского ввода на сервере,
 * в том числе капитализацию первой буквы для категорий и транзакций.
 * ---
 * ### Логика работы:
 * 1. Безопасно обрабатывает null и undefined.
 * 2. Удаляет внешние пробелы с помощью `trim()`.
 * 3. Переводит первый юникод-символ в верхний регистр.
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
