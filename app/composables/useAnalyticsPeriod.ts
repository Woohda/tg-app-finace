/**
 * @module app/composables/useAnalyticsPeriod
 * @fileoverview Управление выбором периодов для аналитики
 * @description
 * Предоставляет текущий период, даты начала и конца для текущего и предыдущего периодов (для сравнения).
 * ---
 * ### Логика работы:
 * 1. Выбор периода: 1 Неделя, 1 Месяц, 3 Месяца, 6 Месяцев, 1 Год.
 * 2. Расчет `startDate` и `endDate` от текущей даты.
 * 3. Расчет `prevStartDate` и `prevEndDate` для сравнения (предыдущий аналогичный период).
 */
import { ref, computed } from "vue";
import type { Ref } from "vue";

export type AnalyticsPeriodType = "1W" | "1M" | "3M" | "6M" | "1Y";

export const useAnalyticsPeriod = (
  initialPeriod?: Ref<AnalyticsPeriodType>,
) => {
  const period = initialPeriod || ref<AnalyticsPeriodType>("1M");
  const anchorDate = ref(new Date());

  const endDate = computed(() => {
    const d = new Date(anchorDate.value);
    d.setHours(23, 59, 59, 999);

    if (
      period.value === "1M" ||
      period.value === "3M" ||
      period.value === "6M"
    ) {
      d.setMonth(d.getMonth() + 1);
      d.setDate(0); // Последний день месяца
    } else if (period.value === "1Y") {
      d.setMonth(11);
      d.setDate(31); // Последний день года
    }
    return d;
  });

  const startDate = computed(() => {
    const d = new Date(anchorDate.value);
    d.setHours(0, 0, 0, 0);
    switch (period.value) {
      case "1W":
        d.setDate(d.getDate() - 6); // Последние 7 дней включая сегодня
        break;
      case "1M":
        d.setDate(1); // 1-е число текущего месяца
        break;
      case "3M":
        d.setDate(1);
        d.setMonth(d.getMonth() - 2); // Текущий месяц + 2 предыдущих
        break;
      case "6M":
        d.setDate(1);
        d.setMonth(d.getMonth() - 5);
        break;
      case "1Y":
        d.setDate(1);
        d.setMonth(0); // 1 января текущего года
        break;
    }
    return d;
  });

  const prevEndDate = computed(() => {
    const d = new Date(startDate.value);
    d.setDate(d.getDate() - 1);
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const prevStartDate = computed(() => {
    const d = new Date(prevEndDate.value);
    d.setHours(0, 0, 0, 0);
    switch (period.value) {
      case "1W":
        d.setDate(d.getDate() - 6);
        break;
      case "1M":
        d.setDate(1);
        break;
      case "3M":
        d.setDate(1);
        d.setMonth(d.getMonth() - 2);
        break;
      case "6M":
        d.setDate(1);
        d.setMonth(d.getMonth() - 5);
        break;
      case "1Y":
        d.setDate(1);
        d.setMonth(0);
        break;
    }
    return d;
  });

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
    const month = startDate.value.toLocaleDateString("ru-RU", {
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
