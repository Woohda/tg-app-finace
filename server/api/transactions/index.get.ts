/**
 * @module server/api/transactions/index.get
 * @fileoverview Серверный обработчик GET-запроса для получения списка транзакций
 * @description
 * Возвращает список транзакций пользователя. По умолчанию возвращает данные за
 * последний месяц, но можно передать `startDate` и `endDate` в query параметрах.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и получение `userId`.
 * 2. `Query Parsing`: Чтение параметров `startDate` и `endDate` (или установка дефолтного диапазона от `getPrevMonth()` до `formatDateISO()`).
 * 3. `Database Query`: Выборка транзакций пользователя с джойном категорий (`category:categories(name, type, icon)`).
 * 4. `Formatting`: Прогон результатов через `formatTransaction` для приведения типов (amount).
 *
 * ### Параметры запроса:
 * - `startDate?: string` — начальная дата выборки (ISO).
 * - `endDate?: string` — конечная дата выборки (ISO).
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка базы данных.
 */

import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const query = getQuery(event);

  const startDateStr = query.startDate
    ? formatDateISO(String(query.startDate))
    : formatDateISO(getPrevMonth());
  const endDateStr = query.endDate
    ? formatDateISO(String(query.endDate))
    : formatDateISO();

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
    .gte("date", startDateStr)
    .lte("date", endDateStr)
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
