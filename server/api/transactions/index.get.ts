/**
 * @module server/api/transactions/index.get
 * @fileoverview Получение списка транзакций текущего пользователя
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

  const query = getQuery(event);

  const defaultStartDate = new Date();
  defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
  defaultStartDate.setHours(0, 0, 0, 0);

  const startDate = query.startDate
    ? new Date(query.startDate as string)
    : defaultStartDate;
  const endDate = query.endDate
    ? new Date(query.endDate as string)
    : new Date();

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id,
      amount,
      type,
      name,
      date,
      created_at,
      categories (
        id,
        name,
        icon
      )
    `,
    )
    .eq("user_id", userId)
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Ошибка получения транзакций:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при загрузке транзакций",
    });
  }

  return data.map(formatTransaction);
});
