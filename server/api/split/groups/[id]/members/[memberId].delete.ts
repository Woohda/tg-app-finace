/**
 * @module server/api/split/groups/[id]/members/[memberId].delete
 * @fileoverview Удаление участника из группы совместных трат
 * @description
 * Удаляет участника из таблицы `split_members`. Выполняет валидацию бизнес-правил:
 * запрещает удаление текущего пользователя и участников, которые
 * уже фигурируют в оплаченных расходах или долях затрат.
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth`.
 * 2. Извлечение и валидация параметров `id` (ID группы) и `memberId` (ID участника).
 * 3. Поиск участника в базе данных `split_members`.
 * 4. Защита от удаления своего профиля (`member.is_current_user`).
 * 5. Проверка связанных записей в `split_expenses` и `split_expense_shares`.
 * 6. Удаление участника из базы данных и возврат статуса успеха.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы.
 * - `memberId` (route param) — UUID удаляемого участника.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: отсутствуют параметры, попытка удалить себя или участника с расходами/долями.
 * - `401 Unauthorized`: отсутствует или недействителен токен авторизации.
 * - `404 Not Found`: участник не найден в указанной группе.
 * - `500 Internal Server Error`: ошибка базы данных Supabase при удалении.
 * 
 * ### Особенности:
 * - Защищает целостность финансовых расчетов: удаление участника с активными тратами исказило бы баланс всей группы.
 */
import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const groupId = getRouterParam(event, "id");
  const memberId = getRouterParam(event, "memberId");

  if (!groupId || !memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Некорректные параметры запроса",
    });
  }

  const supabase = getUserSupabase(token);

  // Проверяем участника
  const { data: member } = await supabase
    .from("split_members")
    .select("id, is_current_user, user_id, group_id")
    .eq("id", memberId)
    .eq("group_id", groupId)
    .single();

  if (!member) {
    throw createError({
      statusCode: 404,
      statusMessage: "Участник не найден",
    });
  }

  if (member.is_current_user || (userId && member.user_id === userId)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Нельзя удалить свой собственный профиль из группы",
    });
  }

  // Проверяем, есть ли расходы или доли у этого участника
  const { count: paidCount } = await supabase
    .from("split_expenses")
    .select("id", { count: "exact", head: true })
    .eq("payer_id", memberId);

  const { count: shareCount } = await supabase
    .from("split_expense_shares")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId);

  if ((paidCount || 0) > 0 || (shareCount || 0) > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Нельзя удалить участника, у которого есть записанные расходы или доли",
    });
  }

  // Проверяем, есть ли взаиморасчеты у этого участника
  const { count: settlementFromCount } = await supabase
    .from("split_settlements")
    .select("id", { count: "exact", head: true })
    .eq("from_member_id", memberId);

  const { count: settlementToCount } = await supabase
    .from("split_settlements")
    .select("id", { count: "exact", head: true })
    .eq("to_member_id", memberId);

  if ((settlementFromCount || 0) > 0 || (settlementToCount || 0) > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Нельзя удалить участника, у которого есть записи взаиморасчетов",
    });
  }

  const { error } = await supabase
    .from("split_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("Ошибка удаления участника:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось удалить участника",
    });
  }

  return { success: true };
});
