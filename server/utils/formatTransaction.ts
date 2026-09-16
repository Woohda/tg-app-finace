/**
 * @module server/utils/formatTransaction
 * @fileoverview Утилита нормализации объектов транзакций
 * @description
 * Преобразует ответ от Supabase (содержащий связанную модель `categories`)
 * в плоский и типизированный объект `Transaction` для фронтенда.
 * ---
 * ### Логика работы:
 * 1. Извлекает первый элемент из массива `categories` (из-за особенностей join в Supabase).
 * 2. Возвращает плоский объект, подставляя дефолтные значения ("Неизвестно", "💸"), если категория была удалена.
 * 
 * ### Параметры:
 * - `t: any` — сырой объект транзакции из БД.
 * 
 * ### Особенности:
 * - Помогает держать интерфейс фронтенда стабильным независимо от схемы БД.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatTransaction(t: any) {
  const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;

  return {
    id: t.id,
    amount: t.amount,
    type: t.type,
    name: t.name,
    date: t.date,
    created_at: t.created_at,
    categoryId: cat?.id || "",
    categoryName: cat?.name || "Неизвестно",
    categoryIcon: cat?.icon || "💸",
  };
}
