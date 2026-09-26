/**
 * @module app/utils/date
 * @fileoverview Чистые функции для работы с датами, числами месяца и периодами
 * @description
 * Использует `date-fns` для детерминированного форматирования и расчета дат
 * в локальном времени клиента/сервера, исключая баги с конвертацией в UTC через toISOString.
 * ---
 * ### Логика работы:
 * 1. Получение текущего времени через `getNow()`.
 * 2. Безопасная нормализация строк и дат через `toSafeDate()`.
 * 3. Форматирование локальных ISO-дат (YYYY-MM-DD) через `formatDateISO()`.
 * 4. Математика дней и месяцев с компенсацией коротких периодов и русским склонением.
 */
import {
  format,
  parseISO,
  getDaysInMonth,
  getDate,
  getMonth,
  getYear as getFnsYear,
  startOfMonth,
  endOfMonth,
  isToday,
  isYesterday,
  subDays,
  addDays,
  addMonths,
  subMonths,
  isLastDayOfMonth,
  isSameMonth,
} from "date-fns";
import { ru } from "date-fns/locale";

/**
 * Возвращает текущий момент времени.
 * Служит единой точкой получения текущей даты во всем приложении.
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Безопасно преобразует входные данные в объект Date.
 * Обрабатывает YYYY-MM-DD как локальную дату (без сдвига UTC в предыдущий день).
 */
export function toSafeDate(input?: Date | string | number | null): Date {
  if (!input) return getNow();
  if (input instanceof Date) return isNaN(input.getTime()) ? getNow() : input;
  if (typeof input === "string") {
    // Если передан чистый формат YYYY-MM-DD, создаем локальную дату без сдвига по UTC
    const dateOnlyMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      return new Date(year, month, day);
    }
    const parsed = parseISO(input);
    return isNaN(parsed.getTime()) ? new Date(input) : parsed;
  }
  return new Date(input);
}

/**
 * Возвращает локальную дату в формате `YYYY-MM-DD`.
 * Исключает смещение часовых поясов, присущее `new Date().toISOString().split("T")[0]`.
 *
 * @example
 * formatDateISO() // "2026-09-26"
 * formatDateISO(new Date(2026, 8, 5)) // "2026-09-05"
 */
export function formatDateISO(dateInput?: Date | string | number | null): string {
  const date = toSafeDate(dateInput);
  return format(date, "yyyy-MM-dd");
}

/**
 * Возвращает число месяца (1..31).
 */
export function getDayOfMonth(dateInput?: Date | string | number | null): number {
  return getDate(toSafeDate(dateInput));
}

/**
 * Возвращает индекс месяца (0..11, где 0 — январь, 11 — декабрь).
 */
export function getMonthIndex(dateInput?: Date | string | number | null): number {
  return getMonth(toSafeDate(dateInput));
}

/**
 * Возвращает порядковый номер месяца (1..12, где 1 — январь, 12 — декабрь).
 */
export function getMonthNumber(dateInput?: Date | string | number | null): number {
  return getMonth(toSafeDate(dateInput)) + 1;
}

/**
 * Возвращает полный год (например, 2026).
 */
export function getYear(dateInput?: Date | string | number | null): number {
  return getFnsYear(toSafeDate(dateInput));
}

/**
 * Возвращает общее количество дней в месяце (28, 29, 30, 31).
 */
export function getDaysInMonthCount(dateInput?: Date | string | number | null): number {
  return getDaysInMonth(toSafeDate(dateInput));
}

/**
 * Возвращает количество прошедших дней в месяце (1..31).
 */
export function getDaysPassedInMonth(dateInput?: Date | string | number | null): number {
  return getDate(toSafeDate(dateInput));
}

/**
 * Возвращает количество оставшихся дней в месяце (включая сегодня, минимум 1).
 */
export function getDaysLeftInMonth(dateInput?: Date | string | number | null): number {
  const date = toSafeDate(dateInput);
  return Math.max(1, getDaysInMonth(date) - getDate(date) + 1);
}

/**
 * Ограничивает плановое число месяца реальным количеством дней в этом месяце.
 * Например, 31-е число в феврале станет 28 или 29.
 */
export function getEffectiveDayOfMonth(
  dayOfMonth: number,
  dateInput?: Date | string | number | null,
): number {
  const maxDays = getDaysInMonthCount(dateInput);
  return Math.min(Math.max(1, dayOfMonth), maxDays);
}

/**
 * Проверяет, приходится ли списание регулярного платежа на целевую дату.
 * Корректно компенсирует короткие месяцы (28, 29, 30 дней) для подписок на 29, 30 и 31 числа.
 */
export function isSubscriptionDueOnDate(
  subDay: number,
  targetDateInput?: Date | string | number | null,
): boolean {
  const targetDate = toSafeDate(targetDateInput);
  const day = getDate(targetDate);
  const daysInMonth = getDaysInMonth(targetDate);
  const isEndOfMonth = isLastDayOfMonth(targetDate);

  return subDay === day || (isEndOfMonth && subDay > daysInMonth);
}

/**
 * Возвращает объект Date в локальном часовом поясе пользователя.
 * Использует нативный Intl.DateTimeFormat без внешних зависимостей.
 */
export function getUserLocalDate(
  timeZone = "Europe/Moscow",
  baseDate: Date = getNow(),
): Date {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(baseDate);
    const getPart = (type: string) =>
      parts.find((p) => p.type === type)?.value || "0";

    return new Date(
      Number(getPart("year")),
      Number(getPart("month")) - 1,
      Number(getPart("day")),
      Number(getPart("hour")),
      Number(getPart("minute")),
      Number(getPart("second")),
    );
  } catch {
    // Резервный расчет для Europe/Moscow (UTC+3)
    return new Date(baseDate.getTime() + 3 * 3600 * 1000);
  }
}

/**
 * Возвращает строковую дату в формате YYYY-MM-DD для указанного часового пояса.
 */
export function getUserLocalDateISO(
  timeZone = "Europe/Moscow",
  dateInput?: Date | string | number | null,
): string {
  const baseDate = toSafeDate(dateInput);
  const local = getUserLocalDate(timeZone, baseDate);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Проверяет, совпадает ли месяц и год переданной даты с текущим моментом.
 */
export function isCurrentMonth(dateInput?: Date | string | number | null): boolean {
  return isSameMonth(toSafeDate(dateInput), getNow());
}

/**
 * Проверяет, совпадает ли год переданной даты с текущим годом.
 */
export function isCurrentYear(dateInput?: Date | string | number | null): boolean {
  return getYear(dateInput) === getYear(getNow());
}

/**
 * Проверяет, приходится ли дата на сегодняшний день.
 */
export function isCurrentDay(dateInput?: Date | string | number | null): boolean {
  return isToday(toSafeDate(dateInput));
}

/**
 * Форматирует последний день месяца в читаемый текст на русском языке.
 *
 * @example
 * formatLastDayOfMonth(new Date(2026, 8, 1)) // "30 сентября"
 */
export function formatLastDayOfMonth(dateInput?: Date | string | number | null): string {
  const lastDay = endOfMonth(toSafeDate(dateInput));
  return format(lastDay, "d MMMM", { locale: ru });
}

/**
 * Форматирует день недели и дату для приветствия на дашборде.
 *
 * @example
 * formatWeekdayAndDate(new Date()) // "суббота, 26 сентября"
 */
export function formatWeekdayAndDate(dateInput?: Date | string | number | null): string {
  const date = toSafeDate(dateInput);
  return format(date, "EEEE, d MMMM", { locale: ru });
}

/**
 * Форматирует название месяца и год.
 *
 * @example
 * formatMonthYear(new Date(2026, 8, 1)) // "Сентябрь 2026"
 */
export function formatMonthYear(dateInput?: Date | string | number | null): string {
  const date = toSafeDate(dateInput);
  const formatted = format(date, "LLLL yyyy", { locale: ru });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const RUSSIAN_MONTHS_DATIVE = [
  "к январю",
  "к февралю",
  "к марту",
  "к апрелю",
  "к маю",
  "к июню",
  "к июлю",
  "к августу",
  "к сентябрю",
  "к октябрю",
  "к ноябрю",
  "к декабрю",
] as const;

const RUSSIAN_MONTHS_PREPOSITIONAL = [
  "в январе",
  "в феврале",
  "в марте",
  "в апреле",
  "в мае",
  "в июне",
  "в июле",
  "в августе",
  "в сентябре",
  "в октябре",
  "в ноябре",
  "в декабре",
] as const;

/**
 * Возвращает название месяца в дательном падеже с предлогом "к" (например, "к сентябрю").
 */
export function formatMonthDative(dateInput?: Date | string | number | null): string {
  const monthIdx = getMonthIndex(dateInput);
  return RUSSIAN_MONTHS_DATIVE[monthIdx] ?? "к прошлому";
}

/**
 * Возвращает название месяца в предложном падеже с предлогом "в" (например, "в сентябре").
 */
export function formatMonthPrepositional(dateInput?: Date | string | number | null): string {
  const monthIdx = getMonthIndex(dateInput);
  return RUSSIAN_MONTHS_PREPOSITIONAL[monthIdx] ?? "";
}

/**
 * Форматирует краткую дату (например "26 сен").
 */
export function formatShortDayMonth(dateInput?: Date | string | number | null): string {
  const date = toSafeDate(dateInput);
  return format(date, "d MMM", { locale: ru });
}

/**
 * Форматирует краткое название месяца (например "сен").
 */
export function formatShortMonth(dateInput?: Date | string | number | null): string {
  const date = toSafeDate(dateInput);
  return format(date, "LLL", { locale: ru });
}

/**
 * Форматирует дату операции для интерфейса: "Сегодня", "Вчера", "26 сен" или "26.09.2026".
 */
export function formatDisplayDate(
  dateInput: Date | string | number | null | undefined,
  fullDate = false,
): string {
  if (!dateInput) return "";
  const date = toSafeDate(dateInput);

  if (fullDate) {
    return format(date, "dd.MM.yyyy");
  }

  if (isToday(date)) return "Сегодня";
  if (isYesterday(date)) return "Вчера";

  return format(date, "d MMM", { locale: ru });
}

/**
 * Форматирует дату и время (например "26 сен, 14:30") для истории уведомлений.
 */
export function formatDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "";
  const date = toSafeDate(dateInput);
  return format(date, "dd MMM, HH:mm", { locale: ru });
}

/**
 * Вычисляет дату смещения на N дней назад в формате YYYY-MM-DD.
 */
export function getPastDateISO(daysAgo: number, baseDate?: Date | string | number): string {
  const base = toSafeDate(baseDate);
  return formatDateISO(subDays(base, daysAgo));
}

/**
 * Добавляет указанное количество дней к дате.
 */
export function addDaysSafe(dateInput: Date | string | number | null | undefined, days: number): Date {
  return addDays(toSafeDate(dateInput), days);
}

/**
 * Вычитает указанное количество дней из даты.
 */
export function subDaysSafe(dateInput: Date | string | number | null | undefined, days: number): Date {
  return subDays(toSafeDate(dateInput), days);
}

/**
 * Безопасно переходит на следующий месяц без бага перескока через 28/30 число.
 */
export function getNextMonth(dateInput?: Date | string | number | null): Date {
  return addMonths(toSafeDate(dateInput), 1);
}

/**
 * Безопасно переходит на предыдущий месяц.
 */
export function getPrevMonth(dateInput?: Date | string | number | null): Date {
  return subMonths(toSafeDate(dateInput), 1);
}

/**
 * Возвращает дату начала месяца (00:00:00).
 */
export function startOfMonthSafe(dateInput?: Date | string | number | null): Date {
  return startOfMonth(toSafeDate(dateInput));
}

/**
 * Возвращает дату конца месяца (23:59:59.999).
 */
export function endOfMonthSafe(dateInput?: Date | string | number | null): Date {
  return endOfMonth(toSafeDate(dateInput));
}

/**
 * Форматирует дату операции для интерфейса (алиас для formatDisplayDate).
 */
export function formatDate(
  dateInput: Date | string | number | null | undefined,
  fullDate = false,
): string {
  return formatDisplayDate(dateInput, fullDate);
}
