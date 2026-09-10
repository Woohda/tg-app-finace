/**
 * @module server/api/transactions/index.get
 * @fileoverview Получение списка транзакций текущего пользователя
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "../../../app/types/database.types";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      amount,
      type,
      description,
      date,
      created_at,
      categories (
        id,
        name,
        icon
      )
    `)
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Ошибка получения транзакций:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при загрузке транзакций",
    });
  }

  // Supabase возвращает связанные таблицы как объект (или массив, зависит от схемы, в нашем случае объект)
  // Форматируем под интерфейс, который ожидает клиент (как в моках)
  const formattedData = data.map((t) => {
    // Явно приводим тип, так как select() возвращает categories как массив или объект в типах
    const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    
    return {
      id: t.id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      date: t.date,
      categoryId: cat?.id || "",
      categoryName: cat?.name || "Неизвестно",
      categoryIcon: cat?.icon || "💸",
    };
  });

  return formattedData;
});
