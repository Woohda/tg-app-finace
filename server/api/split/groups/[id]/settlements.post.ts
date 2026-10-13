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
  const { token } = await requireAuth(event);
  const groupId = getRouterParam(event, "id");

  if (!groupId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID группы",
    });
  }

  const supabase = getUserSupabase(token);

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
