/**
 * @module server/api/split/groups/[id]/settlements.post
 * @fileoverview Фиксация взаиморасчета (возврата долга) между участниками группы
 * @description
 * Записывает факт прямого денежного перевода от одного участника другому в таблицу `split_settlements`.
 * Снижает чистую задолженность между участниками при пересчете балансов.
 * ---
 * ### Логика работы:
 * 1. Проверка авторизации через `requireAuth`.
 * 2. Получение `id` группы и валидация тела запроса через `addSplitSettlementSchema`.
 * 3. Проверка запрета перевода самому себе (`from_member_id !== to_member_id`).
 * 4. Округление суммы перевода через `roundCurrency`.
 * 5. Вставка записи перевода в таблицу `split_settlements`.
 * 6. Возврат созданной записи взаиморасчета.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы совместных трат.
 * - `from_member_id` (body, UUID) — участник, вернувший долг (отправитель).
 * - `to_member_id` (body, UUID) — участник, получивший деньги (получатель).
 * - `amount` (body, number) — сумма перевода (больше 0).
 * - `date` (body, string, optional) — дата перевода (ISO).
 * 
 * ### Ошибки:
 * - `400 Bad Request`: ошибки валидации Zod, перевод самому себе или отсутствие ID группы.
 * - `401 Unauthorized`: неавторизованный запрос.
 * - `500 Internal Server Error`: ошибка сохранения взаиморасчета в Supabase.
 * 
 * ### Особенности:
 * - Запись взаиморасчета симметрично уменьшает долг отправителя и требования получателя в балансовой матрице группы.
 */
import { addSplitSettlementSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";
import { roundCurrency } from "~/utils/splitAlgorithm";

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

  const body = await readValidatedBody(event, (data) =>
    addSplitSettlementSchema.safeParse(data),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации перевода",
      data: body.error.issues,
    });
  }

  const { from_member_id, to_member_id, amount, date } = body.data;

  if (from_member_id === to_member_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Отправитель и получатель не могут совпадать",
    });
  }

  // 2. Проверяем, что оба участника состоят именно в этой группе (защита от IDOR)
  const { data: validMembers, error: membersError } = await supabase
    .from("split_members")
    .select("id, user_id")
    .eq("group_id", groupId)
    .in("id", [from_member_id, to_member_id]);

  if (membersError || !validMembers || validMembers.length !== 2) {
    throw createError({
      statusCode: 400,
      statusMessage: "Один или оба участника не состоят в этой группе",
    });
  }

  // 3. Проверяем, что инициатор является владельцем или участником группы
  const isOwner = group.user_id === userId;
  const isMember = validMembers.some((m) => m.user_id === userId);
  if (!isOwner && !isMember) {
    const { data: callerMember } = await supabase
      .from("split_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!callerMember) {
      throw createError({
        statusCode: 403,
        statusMessage: "У вас нет доступа к этой группе",
      });
    }
  }

  const settlementDate = date || formatDateISO();

  const { data: settlement, error } = await supabase
    .from("split_settlements")
    .insert({
      group_id: groupId,
      from_member_id,
      to_member_id,
      amount: roundCurrency(amount),
      date: settlementDate,
    })
    .select()
    .single();

  if (error || !settlement) {
    console.error("Ошибка сохранения расчета:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось сохранить расчет",
    });
  }

  return settlement;
});
