/**
 * @module server/utils/categories
 * @fileoverview Утилиты для инициализации и управления категориями на сервере.
 * @description
 * Содержит функции для работы с категориями пользователей, включая безопасное
 * клонирование системных шаблонов категорий при регистрации нового пользователя.
 * ---
 * ### Логика работы:
 * 1. Проверяет наличие уже созданных категорий у пользователя (защита от дублирования).
 * 2. Выбирает системные шаблоны категорий (`user_id IS NULL`).
 * 3. Выполняет пакетную вставку (`insert`) дефолтных категорий, привязанных к `userId`.
 *
 * ### Особенности:
 * - Вызывается только в контролируемых местах создания пользователей (`validate.post.ts`, `dev-login.post.ts`).
 * - Не мутирует базу данных внутри GET-запросов, обеспечивая их идемпотентность.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

/**
 * Инициализирует стартовый набор категорий для нового пользователя из системных шаблонов.
 */
export async function seedDefaultCategories(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  // 1. Проверяем, есть ли уже категории у пользователя (идемпотентность)
  const { data: existing, error: checkError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (checkError) {
    console.error("Ошибка проверки существующих категорий пользователя:", checkError);
    return;
  }

  if (existing && existing.length > 0) {
    return;
  }

  // 2. Получаем системные шаблоны категорий
  const { data: templateCategories, error: tplError } = await supabase
    .from("categories")
    .select("name, type, icon")
    .is("user_id", null);

  if (tplError) {
    console.error("Ошибка получения системных шаблонов категорий:", tplError);
    return;
  }

  if (!templateCategories || templateCategories.length === 0) {
    return;
  }

  // 3. Формируем и вставляем персональные категории
  const defaultCategories = templateCategories.map((c) => ({
    name: c.name,
    type: c.type,
    icon: c.icon,
    user_id: userId,
  }));

  const { error: insertError } = await supabase
    .from("categories")
    .insert(defaultCategories);

  if (insertError) {
    console.error("Ошибка при клонировании категорий для пользователя:", insertError);
  }
}
