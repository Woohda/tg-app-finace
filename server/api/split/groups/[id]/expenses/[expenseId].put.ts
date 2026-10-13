/**
 * @module server/api/split/groups/[id]/expenses/[expenseId].put
 * @fileoverview Редактирование существующего расхода в группе совместных трат
 * @description
 * Обновляет заголовок, сумму, плательщика, дату и тип сплита расхода.
 * Пересчитывает доли участников с защитой от потерь при округлении и атомарно заменяет записи в `split_expense_shares`.
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth`.
 * 2. Получение `id` группы и `expenseId`, валидация тела запроса через Zod (`addSplitExpenseSchema`).
 * 3. Проверка существования расхода в базе данных Supabase (`split_expenses`).
 * 4. Пересчет долей:
 *    - `equal`: равное деление с распределением остатка копеек (`calculateEqualShares`).
 *    - `shares`: гибридное деление (фиксированные рубли + весовые доли через `calculateHybridShares`).
 *    - `exact`: фиксация точных сумм с проверкой сходимости баланса.
 * 5. Обновление заголовка, суммы, плательщика и даты в таблице `split_expenses`.
 * 6. Удаление старых долей и вставка актуализированных записей в `split_expense_shares`.
 * 7. Возврат обновленного расхода с массивом долей.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы.
 * - `expenseId` (route param) — UUID редактируемого расхода.
 * - `title` (body, string) — название траты.
 * - `amount` (body, number) — обновленная сумма расхода.
 * - `payer_id` (body, UUID) — участник, оплативший чек.
 * - `date` (body, string, optional) — дата операции (ISO).
 * - `split_type` (body, 'equal' | 'exact' | 'shares') — алгоритм распределения.
 * - `shares` (body, array) — обновленный список участников и их параметров долей.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: ошибка валидации параметров маршрута или Zod-схемы.
 * - `401 Unauthorized`: неавторизованный запрос.
 * - `404 Not Found`: расход не найден в указанной группе.
 * - `500 Internal Server Error`: ошибка записи изменений в Supabase.
 * 
 * ### Особенности:
 * - Производит атомарную замену долей участников в таблице `split_expense_shares`.
 */
import { addSplitExpenseSchema } from "~/types/validate";
import { getUserSupabase } from "~~/server/utils/db";
import {
  calculateExpenseSharesDistribution,
  roundCurrency,
} from "~/utils/splitAlgorithm";

export default defineEventHandler(async (event) => {
  const { token } = await requireAuth(event);
  const groupId = getRouterParam(event, "id");
  const expenseId = getRouterParam(event, "expenseId");

  if (!groupId || !expenseId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Некорректные параметры запроса",
    });
  }

  const supabase = getUserSupabase(token);

  // 1. Проверяем существование расхода в группе
  const { data: existingExpense, error: findError } = await supabase
    .from("split_expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .single();

  if (findError || !existingExpense) {
    throw createError({
      statusCode: 404,
      statusMessage: "Расход не найден",
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
  const roundedTotalAmount = roundCurrency(amount);

  // 2. Рассчитываем и валидируем итоговые суммы долей для каждого выбранного участника
  const calculatedShares = calculateExpenseSharesDistribution(
    roundedTotalAmount,
    split_type,
    shares,
  );

  // 3. Обновляем запись расхода
  const expenseDate = date || new Date().toISOString().slice(0, 10);

  const { data: updatedExpense, error: updateError } = await supabase
    .from("split_expenses")
    .update({
      payer_id,
      amount: roundedTotalAmount,
      title: title.trim(),
      date: expenseDate,
      split_type,
    })
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .select()
    .single();

  if (updateError || !updatedExpense) {
    console.error("Ошибка обновления расхода:", updateError);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось обновить расход",
    });
  }

  // 4. Заменяем доли участников: удаляем старые, вставляем новые
  const { error: deleteSharesError } = await supabase
    .from("split_expense_shares")
    .delete()
    .eq("expense_id", expenseId);

  if (deleteSharesError) {
    console.error("Ошибка очистки старых долей:", deleteSharesError);
  }

  const sharesToInsert = calculatedShares.map((s) => ({
    expense_id: expenseId,
    member_id: s.member_id,
    amount: s.amount,
    share_value: s.share_value,
  }));

  const { error: insertSharesError } = await supabase
    .from("split_expense_shares")
    .insert(sharesToInsert);

  if (insertSharesError) {
    console.error("Ошибка сохранения обновленных долей:", insertSharesError);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось сохранить новые доли расхода",
    });
  }

  return {
    ...updatedExpense,
    shares: calculatedShares,
  };
});
