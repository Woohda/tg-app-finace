/**
 * @module app/composables/useDateFilter
 * @fileoverview Управление фильтрацией данных по датам (по месяцам)
 * 
 * @description
 * Предоставляет реактивное состояние для текущего выбранного месяца 
 * и вычисляет начало (`startDate`) и конец (`endDate`) этого месяца.
 * Включает методы для переключения на следующий и предыдущий месяц.
 * 
 * ### Логика:
 * - `startDate`: 1-е число текущего месяца, 00:00:00.
 * - `endDate`: Последнее число текущего месяца, 23:59:59.
 */
import { ref, computed } from 'vue';

export const useDateFilter = () => {
  const currentDate = ref(new Date());

  const startDate = computed(() => {
    const date = new Date(currentDate.value);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const endDate = computed(() => {
    const date = new Date(currentDate.value);
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    date.setHours(23, 59, 59, 999);
    return date;
  });

  const nextMonth = () => {
    const next = new Date(currentDate.value);
    next.setMonth(next.getMonth() + 1);
    currentDate.value = next;
  };

  const prevMonth = () => {
    const prev = new Date(currentDate.value);
    prev.setMonth(prev.getMonth() - 1);
    currentDate.value = prev;
  };

  return {
    currentDate,
    startDate,
    endDate,
    nextMonth,
    prevMonth,
  };
};
