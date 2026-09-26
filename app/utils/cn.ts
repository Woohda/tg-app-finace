/**
 * @module app/utils/cn
 * @fileoverview Утилитарная функция объединения CSS-классов Tailwind
 * @description
 * Обеспечивает безопасное объединение условных и переопределяющих классов
 * с помощью `clsx` и разрешения конфликтов Tailwind через `tailwind-merge`.
 * ---
 * ### Логика работы:
 * 1. Принимает список аргументов `ClassValue`.
 * 2. Передает их в `clsx` для разрешения условных выражений и массивов.
 * 3. Передает результат в `twMerge` для дедупликации конфликтующих утилит Tailwind.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
