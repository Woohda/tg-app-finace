/**
 * @module app/utils/format
 * @fileoverview Утилитарные функции форматирования и парсинга денежных сумм
 * @description
 * Набор чистых функций для форматирования денежных сумм (`formatAmount`),
 * безопасного парсинга пользовательского ввода (`parseAmount`) и склонения слов.
 * ---
 * ### Логика работы:
 * 1. `formatAmount`: форматирует число в валюту (рубли) с двумя знаками после запятой по локали `ru-RU`.
 * 2. `parseAmount`: очищает строку или число от пробелов, неразрывных пробелов, запятых, валютных символов и возвращает округленный `number` или `NaN`.
 * 3. `getPluralSub`: склоняет существительное "платеж" по заданному числу (единственное/множественное число).
 * 4. `pluralize`: универсальное склонение русских существительных по числительному (1, 2-4, 5+).
 * 5. `getInitials`: извлечение 1-2 букв инициалов из имени пользователя.
 * 6. `getAmountTextSize`: динамический подбор Tailwind-класса размера текста на основе величины суммы.
 */

export function formatAmount(
  amount: number,
  type?: "income" | "expense",
): string {
  const numericAmount = Number.isFinite(amount) ? amount : 0;
  const prefix = type === "expense" ? "−" : "+";
  const absAmount = type ? Math.abs(numericAmount) : numericAmount;
  const roundAmount = absAmount.toFixed(2);
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(roundAmount));
  if (type) return `${prefix} ${formatted}\u00A0₽`;
  return `${formatted}\u00A0₽`;
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
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, "");
  const second = parts[1]?.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, "");
  if (first && second && first[0] && second[0]) {
    return (first[0] + second[0]).toUpperCase();
  }
  const cleanTrimmed = trimmed.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, "");
  if (cleanTrimmed.length >= 2) {
    return cleanTrimmed.slice(0, 2).toUpperCase();
  }
  if (cleanTrimmed.length === 1) {
    return cleanTrimmed.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

type AmountSizeVariant = "card" | "hero" | "compact";

interface AmountSizeConfig {
  large: string;
  medium: string;
  small: string;
}

interface AmountSizeOptions {
  variant?: AmountSizeVariant;
  classes?: AmountSizeConfig;
  mediumThreshold?: number;
  smallThreshold?: number;
}

const AMOUNT_SIZE_PRESETS: Record<AmountSizeVariant, AmountSizeConfig> = {
  card: {
    large: "text-lg",
    medium: "text-base",
    small: "text-sm",
  },
  hero: {
    large: "text-2xl sm:text-3xl",
    medium: "text-xl sm:text-2xl",
    small: "text-lg sm:text-xl",
  },
  compact: {
    large: "text-base",
    medium: "text-sm",
    small: "text-xs",
  },
};

const DEFAULT_MEDIUM_THRESHOLD = 1_000_000;
const DEFAULT_SMALL_THRESHOLD = 10_000_000;

/**
 * Извлекает абсолютное числовое значение из числа или строки.
 */
function extractNumericValue(
  value: number | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.abs(value) : 0;
  }
  const parsed = parseAmount(value);
  if (!Number.isNaN(parsed)) {
    return Math.abs(parsed);
  }
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly ? Number(digitsOnly) : 0;
}

/**
 * @function getAmountTextSize
 * @fileoverview Вычисление Tailwind CSS-класса размера шрифта в зависимости от величины числа
 * @description
 * Динамически подбирает класс размера текста (`text-lg`, `text-base`, `text-sm` и др.)
 * на основе абсолютного значения числа или максимального значения из переданного массива чисел.
 * Предотвращает переполнение контейнеров и перенос длинных сумм (миллионы, десятки миллионов)
 * в карточках, сетках и главных балансовых блоках.
 * ---
 * ### Логика работы:
 * 1. Нормализация входных данных: поддержка чисел, строк, null/undefined или массивов значений.
 * 2. Определение максимальной величины среди переданных значений.
 * 3. Сопоставление с порогами (по умолчанию: >= 1 000 000 — средний, >= 10 000 000 — компактный).
 * 4. Возврат соответствующего Tailwind-класса для выбранного пресета (`card`, `hero` или `compact`).
 */
export function getAmountTextSize(
  amount:
    | number
    | string
    | null
    | undefined
    | (number | string | null | undefined)[],
  variantOrOptions: AmountSizeVariant | AmountSizeOptions = "card",
): string {
  const options: AmountSizeOptions =
    typeof variantOrOptions === "string"
      ? { variant: variantOrOptions }
      : variantOrOptions;

  const variant = options.variant || "card";
  const config = options.classes || AMOUNT_SIZE_PRESETS[variant];
  const medThreshold = options.mediumThreshold ?? DEFAULT_MEDIUM_THRESHOLD;
  const smallThreshold = options.smallThreshold ?? DEFAULT_SMALL_THRESHOLD;

  let maxVal = 0;

  if (Array.isArray(amount)) {
    for (const item of amount) {
      const val = extractNumericValue(item);
      if (val > maxVal) {
        maxVal = val;
      }
    }
  } else {
    maxVal = extractNumericValue(amount);
  }

  if (maxVal >= smallThreshold) {
    return config.small;
  }
  if (maxVal >= medThreshold) {
    return config.medium;
  }
  return config.large;
}
