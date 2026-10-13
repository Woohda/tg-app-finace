/**
 * @module server/api/split/groups/[id]/expenses/[expenseId].delete
 * @fileoverview Удаление расхода из группы совместных трат
 * @description
 * Удаляет запись о расходе из таблицы `split_expenses` и каскадно очищает связанные доли из `split_expense_shares`.
 * Пересчет балансов группы происходит автоматически на клиенте после обновления данных.
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth`.
 * 2. Получение и валидация параметров `id` (ID группы) и `expenseId` (ID расхода).
 * 3. Удаление расхода из базы данных с фильтрацией по `group_id` и `id`.
 * 4. Возврат `{ success: true }`.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы совместных трат.
 * - `expenseId` (route param) — UUID удаляемого расхода.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: отсутствуют обязательные параметры маршрута.
 * - `401 Unauthorized`: неавторизованный пользователь.
 * - `500 Internal Server Error`: ошибка удаления записи в Supabase.
 * 
 * ### Особенности:
 * - Зависимые записи в таблице `split_expense_shares` удаляются каскадно средствами СУБД.
 */
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const groupId = getRouterParam(event, "id");
  const expenseId = getRouterParam(event, "expenseId");

  if (!groupId || !expenseId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Некорректные параметры запроса",
    });
  }

  const supabase = getUserSupabase(token);

  // 1. Проверяем существование группы и права доступа
  const { data: group } = await supabase
    .from("split_groups")
    .select("id, user_id")
    .eq("id", groupId)
    .single();

  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Группа не найдена",
    });
  }

  const isOwner = group.user_id === userId;
  if (!isOwner) {
    const { data: callerMember } = await supabase
      .from("split_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!callerMember) {
      throw createError({
        statusCode: 403,
        statusMessage: "У вас нет прав на управление этой группой",
      });
    }
  }

  // 2. Проверяем существование расхода
  const { data: expense } = await supabase
    .from("split_expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .single();

  if (!expense) {
    throw createError({
      statusCode: 404,
      statusMessage: "Расход не найден",
    });
  }

  const { error } = await supabase
    .from("split_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", groupId);

  if (error) {
    console.error("Ошибка удаления расхода:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось удалить расход",
    });
  }

  return { success: true };
});
