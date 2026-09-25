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
