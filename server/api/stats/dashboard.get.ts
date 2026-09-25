/**
 * @module server/api/stats/dashboard.get
 * @fileoverview Серверный обработчик GET-запроса для получения дашборд-статистики
 * @description
 * Агрегирует статистику текущего месяца (траты, среднее в день, топ категории)
 * и сравнивает с прошлым месяцем для отображения прогресса.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и получение `userId`.
 * 2. `Date Math`: Расчет начала и конца текущего и прошлого месяцев.
 * 3. `Database Query`: Выборка всех транзакций за два месяца с привязкой к категориям.
 * 4. `Aggregation`: Подсчет сумм расходов за этот и прошлый месяцы, вычисление среднего чека и группировка по категориям (Топ-3).
 *
 * ### Параметры запроса:
 * - Нет параметров (рассчитывается от текущего серверного времени).
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка выполнения запроса к базе данных Supabase.
 *
 * ### Особенности:
 * - Вся аналитика выполняется на стороне сервера для оптимизации клиентского бандла.
 */

import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const now = new Date();

  // Текущий месяц
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInCurrentMonth = now.getDate() || 1; // Защита от деления на 0

  // Прошлый месяц
  const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  );
  const daysInPastMonth = pastMonthEnd.getDate();

  // Получаем все расходы с начала прошлого месяца
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, date")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", pastMonthStart.toISOString().split("T")[0])
    .lte("date", now.toISOString().split("T")[0]);

  if (error) {
    console.error("Ошибка при получении статистики:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при загрузке статистики",
    });
  }

  let currentMonthExpense = 0;
  let pastMonthExpense = 0;

  for (const t of data || []) {
    const d = new Date(t.date);
    if (d >= currentMonthStart) {
      currentMonthExpense += t.amount;
    } else if (d >= pastMonthStart && d <= pastMonthEnd) {
      pastMonthExpense += t.amount;
    }
  }

  const currentDailyAvg = currentMonthExpense / daysInCurrentMonth;
  const pastDailyAvg = pastMonthExpense / daysInPastMonth;

  let percentChange = 0;
  if (pastDailyAvg > 0) {
    percentChange = Math.round(
      ((currentDailyAvg - pastDailyAvg) / pastDailyAvg) * 100,
    );
  } else if (currentDailyAvg > 0) {
    percentChange = 100; // Если в прошлом месяце трат не было, а сейчас есть
  }

  return {
    currentMonthExpense,
    pastMonthExpense,
    currentDailyAvg,
    pastDailyAvg,
    percentChange,
  };
});
