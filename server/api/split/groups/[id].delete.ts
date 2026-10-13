/**
 * @module server/api/split/groups/[id].delete
 * @fileoverview Удаление группы совместных трат
 * @description
 * Удаляет группу и каскадно связанные записи (участников, расходы, доли, расчеты).
 * Доступно только владельцу (создателю) группы (`user_id = userId`).
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth` и извлечение `userId`.
 * 2. Получение и валидация параметра `id` (ID группы).
 * 3. Проверка прав: поиск группы и сопоставление `group.user_id` с текущим `userId`.
 * 4. Удаление группы из таблицы `split_groups` в Supabase (каскадное удаление данных).
 * 5. Возврат `{ success: true }`.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы совместных трат.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: параметр `id` отсутствует или некорректен.
 * - `401 Unauthorized`: пользователь не авторизован.
 * - `403 Forbidden`: попытка удаления чужой группы (не создатель).
 * - `404 Not Found`: группа не найдена.
 * - `500 Internal Server Error`: ошибка удаления записи в Supabase.
 * 
 * ### Особенности:
 * - Удаление группы автоматически очищает связанные таблицы на уровне PostgreSQL `ON DELETE CASCADE`.
 */
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const groupId = getRouterParam(event, "id");

  if (!groupId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID группы",
    });
  }

  const supabase = getUserSupabase(token);

  // Проверяем, что текущий пользователь — владелец
  const { data: group } = await supabase
    .from("split_groups")
    .select("user_id")
    .eq("id", groupId)
    .single();

  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Группа не найдена",
    });
  }

  if (group.user_id !== userId) {
    throw createError({
      statusCode: 403,
      statusMessage: "Только создатель может удалить группу",
    });
  }

  const { error } = await supabase
    .from("split_groups")
    .delete()
    .eq("id", groupId);

  if (error) {
    console.error("Ошибка удаления группы:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось удалить группу",
    });
  }

  return { success: true };
});
