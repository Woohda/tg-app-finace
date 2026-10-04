/**
 * @module app/composables/useAnalyticsPeriod
 * @fileoverview Управление выбором периодов и интервалами дат для аналитики
 * @description
 * Предоставляет текущий период, даты начала и конца для текущего и сравнительного интервалов.
 * Поддерживает кастомную опорную дату (`customAnchorDate`) для навигации по архивным месяцам.
 * При выборе архивного месяца сравнительный период автоматически переключается на текущий календарный месяц.
 * ---
 * ### Логика работы:
 * 1. Выбор периода: 1 Неделя (`1W`), 1 Месяц (`1M`), 3 Месяца (`3M`), 6 Месяцев (`6M`), 1 Год (`1Y`).
 * 2. Определение базовой даты: `customAnchorDate` (если передан) или системное текущее время.
 * 3. Расчет `startDate` и `endDate` от базовой даты с помощью функций `date-fns`.
 * 4. Расчет `prevStartDate` и `prevEndDate`: для текущего месяца берется предшествующий месяц, а для архивного месяца — текущий календарный месяц.
 * 5. Формирование локализованных меток сравнения (`prevPeriodLabel`, `monthsLabel`) в дательном и предложном падежах.
 * 6. Определение флага `isCurrentMonthSelected` для условного рендеринга виджетов.
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
import { isCurrentMonth } from "~/utils/date";

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
  customAnchorDate?: Ref<Date>,
) => {
  const period = initialPeriod || ref<AnalyticsPeriodType>("1M");
  const anchorDate = customAnchorDate || ref(getNow());

  const isCurrentMonthSelected = computed(() => {
    return isCurrentMonth(anchorDate.value);
  });

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

  const prevEndDate = computed(() => {
    if (period.value === "1M" && !isCurrentMonthSelected.value) {
      return endOfMonth(getNow());
    }
    return endOfDay(subDays(startDate.value, 1));
  });

  const prevStartDate = computed(() => {
    if (period.value === "1M" && !isCurrentMonthSelected.value) {
      return startOfMonth(getNow());
    }
    return calculatePeriodStart(prevEndDate.value, period.value);
  });

  const prevPeriodLabel = computed(() => {
    if (period.value === "1M") {
      if (!isCurrentMonthSelected.value) {
        return formatMonthDative(getNow());
      }
      return formatMonthDative(prevStartDate.value);
    }
    switch (period.value) {
      case "1W":
        return "к прошлой неделе";
      case "3M":
        return "к прошлому периоду";
      case "6M":
        return "к прошлому периоду";
      case "1Y":
        return `к ${getYear(prevStartDate.value)} году`;
      default:
        return "к прошлому";
    }
  });

  const monthsLabel = computed(() => {
    if (period.value === "1M" && !isCurrentMonthSelected.value) {
      return formatMonthPrepositional(getNow());
    }
    return formatMonthPrepositional(prevStartDate.value);
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
    isCurrentMonthSelected,
  };
};
