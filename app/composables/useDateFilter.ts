/**
 * @module app/composables/useDateFilter
 * @fileoverview Управление фильтрацией данных по датам (по месяцам)
 * @description
 * Предоставляет реактивное состояние для текущего выбранного месяца
 * и вычисляет границы начала (`startDate`) и конца (`endDate`) месяца.
 * Включает методы для переключения между месяцами через `getNextMonth` и `getPrevMonth`.
 * ---
 * ### Логика работы:
 * 1. Инициализация текущей даты от `getNow()`.
 * 2. Вычисление `startDate` (1-е число месяца) и `endDate` (последнее число месяца).
 * 3. Навигация `nextMonth()` и `prevMonth()` без перескока через крайние числа.
 */
import { ref, computed } from "vue";
import { startOfMonth, endOfMonth } from "date-fns";

export const useDateFilter = () => {
  const currentDate = ref(getNow());

  const startDate = computed(() => startOfMonth(currentDate.value));
  const endDate = computed(() => endOfMonth(currentDate.value));

  const nextMonth = () => {
    currentDate.value = getNextMonth(currentDate.value);
  };

  const prevMonth = () => {
    currentDate.value = getPrevMonth(currentDate.value);
  };

  return {
    currentDate,
    startDate,
    endDate,
    nextMonth,
    prevMonth,
  };
};
