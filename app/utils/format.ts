/**
 * @module app/utils/format
 * @fileoverview Утилитарные функции форматирования и парсинга денежных сумм и процентов
 * @description
 * Набор чистых функций для форматирования денежных сумм (`formatAmount`),
 * процентов (`formatPercent`) и безопасного парсинга пользовательского ввода (`parseAmount`).
 * ---
 * ### Логика работы:
 * 1. `formatAmount`: форматирует число в валюту (рубли) с двумя знаками после запятой по локали `ru-RU`.
 * 2. `parseAmount`: очищает строку или число от пробелов, неразрывных пробелов, запятых, валютных символов и возвращает округленный `number` или `NaN`.
 * 3. `formatPercent`: форматирует динамику изменений с явным знаком плюса/минуса и заданным суффиксом.
 * 4. `getPluralSub`: склоняет существительное "платеж" по заданному числу (единственное/множественное число).
 * 5. `pluralize`: универсальное склонение русских существительных по числительному (1, 2-4, 5+).
 * 6. `getInitials`: извлечение 1-2 букв инициалов из имени пользователя.
 */

export function formatAmount(
  amount: number,
  type?: "income" | "expense",
): string {
  const prefix = type === "expense" ? "−" : "+";
  const roundAmount = amount.toFixed(2);
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(roundAmount));
  if (type) return `${prefix} ${formatted} ₽`;
  return `${formatted} ₽`;
}

export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN;
  }
  if (value === null || value === undefined) {
    return NaN;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return NaN;
  }

  // Удаляем пробелы (включая неразрывные \u00A0)
  let cleaned = trimmed.replace(/[\s\u00A0]+/g, "");
  // Удаляем валютные знаки и текст по краям
  cleaned = cleaned.replace(/^[^\d.,-]+|[^\d.,-]+$/g, "");
  // Заменяем все запятые на точки
  cleaned = cleaned.replace(/,/g, ".");

  if (!cleaned || cleaned === "-" || cleaned === ".") {
    return NaN;
  }

  const num = Number(cleaned);
  if (!Number.isFinite(num)) {
    return NaN;
  }

  return Math.round(num * 100) / 100;
}

export function formatPercent(
  percent: number,
  suffix: string = "к прошлому месяцу",
): string {
  const prefix = percent > 0 ? "+" : "";
  // Округление до десятых (убираем лишние нули в конце, если число целое)
  const rounded = Number(percent.toFixed(1));
  return `${prefix}${rounded}% ${suffix}`.trim();
}

/**
 * Преобразует первый символ строки в верхний регистр (с заглавной буквы).
 * Безопасно обрабатывает пустые значения, пробелы и юникод (кириллицу, латиницу).
 */
export function capitalizeFirstLetter(str: string): string;
export function capitalizeFirstLetter(str: null): null;
export function capitalizeFirstLetter(str: undefined): undefined;
export function capitalizeFirstLetter(
  str?: string | null,
): string | null | undefined;
export function capitalizeFirstLetter(
  str?: string | null,
): string | null | undefined {
  if (str === null) return null;
  if (str === undefined) return undefined;
  const trimmed = str.trim();
  if (!trimmed) return "";
  const chars = Array.from(trimmed);
  chars[0] = chars[0]!.toUpperCase();
  return chars.join("");
}

/**
 * @function pluralize
 * @fileoverview Универсальное склонение русских существительных по числительному
 * @description
 * Принимает число и массив из трех форм: [для 1 (участник), для 2-4 (участника), для 5+ (участников)].
 * Возвращает правильную форму слова в зависимости от абсолютного значения числа.
 */
export function pluralize(
  count: number,
  forms: [string, string, string],
): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod100 >= 11 && mod100 <= 19) {
    return forms[2];
  }
  if (mod10 === 1) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return forms[1];
  }
  return forms[2];
}

/**
 * @function getPluralSub
 * @fileoverview Склонение существительного "платеж" по числу
 * @description
 * Использует функцию `pluralize` для выбора формы слова «платёж / платежа / платежей».
 */
export function getPluralSub(count: number): string {
  return pluralize(count, ["платёж", "платежа", "платежей"]);
}

/**
 * @function getInitials
 * @fileoverview Извлечение 1-2 букв инициалов из имени пользователя
 * @description
 * Разбивает строку имени по пробелам. Если переданы имя и фамилия, возвращает
 * первые буквы каждого слова в верхнем регистре (например, "Иван Петров" -> "ИП").
 * Если имя состоит из одного слова, возвращает первые 2 буквы.
 */
export function getInitials(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
