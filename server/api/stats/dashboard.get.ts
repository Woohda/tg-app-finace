/**
 * @module server/api/stats/dashboard.get
 * @fileoverview Получение агрегированной статистики для дашборда (сравнение с прошлым месяцем)
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

  const now = new Date();
  
  // Текущий месяц
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInCurrentMonth = now.getDate() || 1; // Защита от деления на 0

  // Прошлый месяц
  const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const daysInPastMonth = pastMonthEnd.getDate();

  // Получаем все расходы с начала прошлого месяца
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, date")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", pastMonthStart.toISOString())
    .lte("date", now.toISOString());

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
    percentChange = Math.round(((currentDailyAvg - pastDailyAvg) / pastDailyAvg) * 100);
  } else if (currentDailyAvg > 0) {
    percentChange = 100; // Если в прошлом месяце трат не было, а сейчас есть
  }

  return {
    currentMonthExpense,
    pastMonthExpense,
    currentDailyAvg,
    pastDailyAvg,
    percentChange
  };
});
