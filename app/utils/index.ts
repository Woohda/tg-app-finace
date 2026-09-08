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
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  if (type) return `${prefix} ${formatted} ₽`;
  return `${formatted} ₽`;
}

export function formatPercent(percent: number): string {
  const prefix = percent > 0 ? "+" : "";
  // Округление до десятых (убираем лишние нули в конце, если число целое)
  const rounded = Number(percent.toFixed(1));
  return `${prefix}${rounded}% к прошлому месяцу`;
}

export function formatDate(str: string): string {
  const date = new Date(str);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Доброе утро,";
  if (hour >= 12 && hour < 18) return "Добрый день,";
  if (hour >= 18 && hour < 23) return "Добрый вечер,";
  return "Доброй ночи,";
}
