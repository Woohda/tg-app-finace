/**
 * @module server/api/split/groups/[id]/expenses.post
 * @fileoverview Добавление нового расхода в группу совместных трат
 * @description
 * Создает расход в группе, производит математический расчет долей участников
 * в зависимости от типа деления (`equal`, `exact`, `shares`) с защитой от потерь при округлении
 * и сохраняет записи в таблицах `split_expenses` и `split_expense_shares`.
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth`.
 * 2. Получение `id` группы и валидация тела запроса через Zod (`addSplitExpenseSchema`).
 * 3. Расчет долей:
 *    - `equal`: равное деление с распределением остатка копеек (`calculateEqualShares`).
 *    - `shares`: гибридное деление (фиксированные рубли + весовые доли через `calculateHybridShares`).
 *    - `exact`: фиксация точных сумм с проверкой сходимости баланса.
 * 4. Сохранение записи расхода в `split_expenses`.
 * 5. Пакетная вставка долей участников в `split_expense_shares`.
 * 6. Возврат созданного расхода с массивом долей.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы.
 * - `title` (body, string) — название траты.
 * - `amount` (body, number) — общая сумма расхода.
 * - `payer_id` (body, UUID) — участник, оплативший чек.
 * - `date` (body, string, optional) — дата операции (ISO).
 * - `split_type` (body, 'equal' | 'exact' | 'shares') — алгоритм распределения.
 * - `shares` (body, array) — список участников и их параметров долей.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: ошибка валидации Zod, несовпадение суммы точных долей или отсутствие ID группы.
 * - `401 Unauthorized`: неавторизованный запрос.
 * - `500 Internal Server Error`: сбой записи в базу данных Supabase.
 * 
 * ### Особенности:
 * - Использует центовое округление (`roundCurrency`) для предотвращения расхождений на доли копеек.
 */
import { addSplitExpenseSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";
import {
  calculateExpenseSharesDistribution,
  roundCurrency,
} from "~/utils/splitAlgorithm";

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

  // 1. Проверяем существование группы
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
    addSplitExpenseSchema.safeParse(data),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации расхода",
      data: body.error.issues,
    });
  }

  const { title, amount, payer_id, date, split_type, shares } = body.data;

  // 2. Проверяем, что плательщик и все участники сплита принадлежат данной группе (защита от IDOR)
  const involvedMemberIds = Array.from(
    new Set([payer_id, ...shares.map((s) => s.member_id)]),
  );

  const { data: validMembers, error: membersError } = await supabase
    .from("split_members")
    .select("id, user_id")
    .eq("group_id", groupId)
    .in("id", involvedMemberIds);

  if (
    membersError ||
    !validMembers ||
    validMembers.length !== involvedMemberIds.length
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Один или несколько участников не принадлежат данной группе",
    });
  }

  // 3. Проверяем права доступа: инициатор должен быть владельцем или участником группы
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

  const roundedTotalAmount = roundCurrency(amount);

  // Рассчитываем и валидируем итоговые суммы долей для каждого участника
  const calculatedShares = calculateExpenseSharesDistribution(
    roundedTotalAmount,
    split_type,
    shares,
  );

  // 4. Создаем расход
  const expenseDate = date || formatDateISO();

  const { data: expense, error: expenseError } = await supabase
    .from("split_expenses")
    .insert({
      group_id: groupId,
      payer_id,
      amount: roundedTotalAmount,
      title: title.trim(),
      date: expenseDate,
      split_type,
    })
    .select()
    .single();

  if (expenseError || !expense) {
    console.error("Ошибка сохранения расхода:", expenseError);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось сохранить расход",
    });
  }

  // 5. Сохраняем доли участников
  const sharesToInsert = calculatedShares.map((s) => ({
    expense_id: expense.id,
    member_id: s.member_id,
    amount: s.amount,
    share_value: s.share_value,
  }));

  const { error: sharesError } = await supabase
    .from("split_expense_shares")
    .insert(sharesToInsert);

  if (sharesError) {
    console.error("Ошибка сохранения долей расхода:", sharesError);
    // Откатываем расход при сбое записи долей, предотвращая появление сиротских записей
    await supabase.from("split_expenses").delete().eq("id", expense.id);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось сохранить доли расхода",
    });
  }

  return {
    ...expense,
    shares: sharesToInsert,
  };
});
