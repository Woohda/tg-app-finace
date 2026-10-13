/**
 * @module server/api/split/groups/[id]/expenses/[expenseId]/to-transaction.post
 * @fileoverview Внесение доли текущего пользователя в личные расходы FINO
 * @description
 * Находит долю авторизованного пользователя в конкретном групповом расходе
 * и автоматически регистрирует транзакцию расхода в основной таблице `transactions` FINO.
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth` и получение `userId`.
 * 2. Получение `id` группы и `expenseId` расхода из параметров маршрута.
 * 3. Валидация выбранной категории транзакции (`exportToTransactionSchema`).
 * 4. Определение участника группы, соответствующего текущему пользователю (`split_members`).
 * 5. Загрузка расхода и проверка наличия доли пользователя (`split_expense_shares`).
 * 6. Создание персональной транзакции расхода в таблице `transactions`.
 * 7. Возврат созданной транзакции.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы совместных трат.
 * - `expenseId` (route param) — UUID расхода.
 * - `category_id` (body, UUID) — ID категории личных финансов FINO.
 * - `title` (body, string, optional) — пользовательское название создаваемой транзакции.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: не указаны параметры, не выбрана категория или доля равна 0.
 * - `401 Unauthorized`: неавторизованный запрос.
 * - `404 Not Found`: пользователь не найден в группе или расход не найден.
 * - `500 Internal Server Error`: ошибка создания записи в таблице `transactions`.
 * 
 * ### Особенности:
 * - Бесшовная интеграция совместных расходов со статистикой, бюджетами и целями личных финансов.
 */
import { exportToTransactionSchema } from "~/types/validate";
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

  const body = await readValidatedBody(event, (data) =>
    exportToTransactionSchema.safeParse(data),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Необходимо выбрать категорию расхода",
      data: body.error.issues,
    });
  }

  const { category_id, title } = body.data;

  // 1. Находим профиль участника для текущего пользователя в группе
  const { data: members } = await supabase
    .from("split_members")
    .select("id, user_id, is_current_user")
    .eq("group_id", groupId);

  const currentMember = (members || []).find(
    (m) => userId && m.user_id === userId,
  );

  if (!currentMember) {
    throw createError({
      statusCode: 404,
      statusMessage: "Вы не являетесь участником этой группы",
    });
  }

  // 2. Находим расход и долю текущего пользователя
  const { data: expense } = await supabase
    .from("split_expenses")
    .select("id, title, date, split_expense_shares (member_id, amount)")
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .single();

  if (!expense) {
    throw createError({
      statusCode: 404,
      statusMessage: "Расход не найден",
    });
  }

  const userShare = (expense.split_expense_shares || []).find(
    (s) => s.member_id === currentMember.id,
  );

  if (!userShare || Number(userShare.amount) <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "У вас нет доли в этом расходе",
    });
  }

  // 3. Создаем стандартную транзакцию расхода в FINO
  const transactionName = title?.trim() || `[Сплит] ${expense.title}`;
  const shareAmount = Number(userShare.amount);

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      category_id,
      amount: shareAmount,
      type: "expense",
      name: transactionName,
      date: expense.date,
    })
    .select(TRANSACTION_SELECT_FIELDS)
    .single();

  if (error || !transaction) {
    console.error("Ошибка добавления транзакции из сплита:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось добавить расход в личные финансы",
    });
  }

  return transaction;
});
