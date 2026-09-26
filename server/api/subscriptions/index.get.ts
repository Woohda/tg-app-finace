/**
 * @module server/api/subscriptions/index.get
 * @fileoverview Серверный обработчик GET-запроса для получения регулярных платежей
 * @description
 * Возвращает список активных и неактивных регулярных платежей текущего пользователя
 * с присоединенными данными категорий, отсортированных по дню месяца.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и извлечение `userId`.
 * 2. `Database Query`: Выборка из таблицы `subscriptions` через `SUBSCRIPTION_SELECT_FIELDS` (джойн `categories (id, name, icon)`).
 * 3. `Ordering`: Сортировка по возрастанию дня месяца (`day_of_month` ASC) и названию.
 *
 * ### Ошибки:
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка выполнения запроса к базе данных.
 */
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT_FIELDS)
    .eq("user_id", userId)
    .order("day_of_month", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Ошибка получения подписок:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при загрузке регулярных платежей",
    });
  }

  return (data || []).map((sub) => {
    // В Supabase при джойне categories может быть объектом или null
    const cat = Array.isArray(sub.categories) ? sub.categories[0] : sub.categories;
    return {
      id: sub.id,
      name: sub.name,
      amount: Number(sub.amount),
      day_of_month: sub.day_of_month,
      is_active: sub.is_active,
      created_at: sub.created_at,
      updated_at: sub.updated_at,
      category_id: sub.category_id,
      categoryName: cat?.name || "Без категории",
      categoryIcon: cat?.icon || "💸",
    };
  });
});
