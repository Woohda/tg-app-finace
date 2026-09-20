/**
 * @module app/utils
 * @fileoverview Утилитарные функции для работы с классами (Tailwind merge) и форматами данных
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function formatPercent(
  percent: number,
  suffix: string = "к прошлому месяцу",
): string {
  const prefix = percent > 0 ? "+" : "";
  // Округление до десятых (убираем лишние нули в конце, если число целое)
  const rounded = Number(percent.toFixed(1));
  return `${prefix}${rounded}% ${suffix}`.trim();
}

export function formatDate(str: string, fullDate: boolean = false): string {
  const date = new Date(str);
  const today = new Date();
  const yesterday = new Date();
  if (fullDate) {
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}
