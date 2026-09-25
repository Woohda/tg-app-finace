/**
 * @module app/composables/useAnalyticsPeriod
 * @fileoverview Управление выбором периодов для аналитики
 * @description
 * Предоставляет текущий период, даты начала и конца для текущего и предыдущего периодов (для сравнения).
 * Расчет дат унифицирован с помощью библиотеки `date-fns`.
 * ---
 * ### Логика работы:
 * 1. Выбор периода: 1 Неделя, 1 Месяц, 3 Месяца, 6 Месяцев, 1 Год.
 * 2. Расчет `startDate` и `endDate` от базовой даты (`anchorDate`).
 * 3. Расчет `prevStartDate` и `prevEndDate` для сравнения с предыдущим аналогичным периодом.
 */
import { ref, computed } from "vue";
import type { Ref } from "vue";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns";

export type AnalyticsPeriodType = "1W" | "1M" | "3M" | "6M" | "1Y";

/**
 * Вычисляет дату начала периода относительно опорной даты.
 */
function calculatePeriodStart(anchor: Date, period: AnalyticsPeriodType): Date {
  const start = startOfDay(anchor);
  switch (period) {
    case "1W":
      return subDays(start, 6); // Последние 7 дней включая сегодня
    case "1M":
      return startOfMonth(start); // 1-е число текущего месяца
    case "3M":
      return startOfMonth(subMonths(start, 2)); // Текущий месяц + 2 предыдущих
    case "6M":
      return startOfMonth(subMonths(start, 5)); // Текущий месяц + 5 предыдущих
    case "1Y":
      return startOfYear(start); // 1 января текущего года
  }
}

export const useAnalyticsPeriod = (
  initialPeriod?: Ref<AnalyticsPeriodType>,
) => {
  const period = initialPeriod || ref<AnalyticsPeriodType>("1M");
  const anchorDate = ref(new Date());

  const endDate = computed(() => {
    const anchor = anchorDate.value;
    if (period.value === "1W") {
      return endOfDay(anchor);
    }
    if (period.value === "1Y") {
      return endOfYear(anchor);
    }
    return endOfMonth(anchor);
  });

  const startDate = computed(() =>
    calculatePeriodStart(anchorDate.value, period.value),
  );

  const prevEndDate = computed(() => endOfDay(subDays(startDate.value, 1)));

  const prevStartDate = computed(() =>
    calculatePeriodStart(prevEndDate.value, period.value),
  );

  const prevPeriodLabel = computed(() => {
    if (period.value === "1M") {
      const months = [
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
      ];
      return months[prevStartDate.value.getMonth()] ?? "к прошлому";
    }
    switch (period.value) {
      case "1W":
        return "к прошлой неделе";
      case "3M":
        return "к прошлому периоду";
      case "6M":
        return "к прошлому периоду";
      case "1Y":
        return `к ${prevStartDate.value.getFullYear()} году`;
      default:
        return "к прошлому";
    }
  });

  const monthsLabel = computed(() => {
    const month = prevStartDate.value.toLocaleDateString("ru-RU", {
      month: "long",
    });
    // Формируем предложный падеж (в январе, в марте, в мае)
    if (month.endsWith("ь") || month.endsWith("й")) {
      return month.slice(0, -1) + "е";
    }
    return month + "е";
  });

  return {
    period,
    anchorDate,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    prevPeriodLabel,
    monthsLabel,
  };
};
