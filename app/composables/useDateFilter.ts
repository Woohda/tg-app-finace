/**
 * @module app/composables/useDateFilter
 * @fileoverview Управление фильтрацией данных по датам (по месяцам)
 * 
 * @description
 * Предоставляет реактивное состояние для текущего выбранного месяца 
 * и вычисляет начало (`startDate`) и конец (`endDate`) этого месяца с помощью `date-fns`.
 * Включает методы для переключения на следующий и предыдущий месяц.
 * 
 * ### Логика:
 * - `startDate`: 1-е число текущего месяца, 00:00:00 (startOfMonth).
 * - `endDate`: Последнее число текущего месяца, 23:59:59.999 (endOfMonth).
 */
import { ref, computed } from "vue";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export const useDateFilter = () => {
  const currentDate = ref(new Date());

  const startDate = computed(() => startOfMonth(currentDate.value));
  const endDate = computed(() => endOfMonth(currentDate.value));

  const nextMonth = () => {
    currentDate.value = addMonths(currentDate.value, 1);
  };

  const prevMonth = () => {
    currentDate.value = subMonths(currentDate.value, 1);
  };

  return {
    currentDate,
    startDate,
    endDate,
    nextMonth,
    prevMonth,
  };
};
