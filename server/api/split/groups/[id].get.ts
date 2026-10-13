/**
 * @module server/api/split/groups/[id].get
 * @fileoverview Получение полной информации о группе совместных трат
 * @description
 * Возвращает детальную информацию о группе, список участников с их профилями,
 * все расходы с рассчитанными долями, историю взаиморасчетов,
 * а также рассчитывает текущие балансы и алгоритмически оптимизированные переводы (Min Cash Flow).
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth`.
 * 2. Получение и валидация параметра `id` (ID группы).
 * 3. Загрузка записи группы из `split_groups`.
 * 4. Загрузка участников из `split_members` с джойном `users` (для получения Telegram ID).
 * 5. Загрузка расходов из `split_expenses` с долями из `split_expense_shares`.
 * 6. Загрузка взаиморасчетов из `split_settlements`.
 * 7. Расчет балансов участников с помощью `calculateMemberBalances`.
 * 8. Оптимизация долговых обязательств через `simplifyDebts`.
 * 9. Возврат агрегированного объекта `SplitGroupDetail`.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы совместных трат.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: параметр `id` отсутствует.
 * - `401 Unauthorized`: неавторизованный запрос.
 * - `404 Not Found`: группа не найдена или нет прав доступа.
 * - `500 Internal Server Error`: ошибка выполнения SQL-запроса в Supabase.
 * 
 * ### Особенности:
 * - Оптимизация долгов сводит множество взаимных переводов к минимально возможному числу транзакций.
 */
import { getUserSupabase } from "~~/server/utils/db";
import {
  calculateMemberBalances,
  simplifyDebts,
  roundCurrency,
} from "~/utils/splitAlgorithm";
import type {
  SplitMember,
  SplitExpense,
  SplitSettlement,
  SplitGroupDetail,
} from "~/types/split";

export default defineEventHandler(async (event): Promise<SplitGroupDetail> => {
  const { userId, token } = await requireAuth(event);
  const groupId = getRouterParam(event, "id");

  if (!groupId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID группы",
    });
  }

  const supabase = getUserSupabase(token);

  // 1. Получаем группу
  const { data: group, error: groupError } = await supabase
    .from("split_groups")
    .select("id, name, currency, user_id, created_at")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Группа не найдена",
    });
  }

  // 2. Получаем участников с джойном пользователей (для telegram_id)
  const { data: rawMembers, error: membersError } = await supabase
    .from("split_members")
    .select(
      `
      id,
      group_id,
      name,
      user_id,
      is_current_user,
      created_at,
      users (
        telegram_id,
        username,
        first_name
      )
    `,
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (membersError) {
    console.error("Ошибка загрузки участников группы:", membersError);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка загрузки участников",
    });
  }

  // Проверяем доступ: пользователь должен быть владельцем группы или одним из участников
  const isOwner = group.user_id === userId;
  const isMember = (rawMembers || []).some((m) => m.user_id === userId);

  if (!isOwner && !isMember) {
    throw createError({
      statusCode: 403,
      statusMessage: "У вас нет доступа к этой группе",
    });
  }

  const members: SplitMember[] = (rawMembers || []).map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    const isCurrentUser = Boolean(
      (userId && m.user_id === userId) ||
        (!m.user_id && isOwner && m.is_current_user),
    );
    const profileName = u?.first_name?.trim() || u?.username?.trim();
    const displayName = m.name === "Я" && profileName ? profileName : m.name;

    return {
      id: m.id,
      group_id: m.group_id,
      name: displayName,
      user_id: m.user_id,
      is_current_user: isCurrentUser,
      created_at: m.created_at,
      telegram_id: u?.telegram_id ?? null,
    };
  });

  const memberNameMap = new Map<string, string>();
  for (const m of members) {
    memberNameMap.set(m.id, m.name);
  }

  // 3. Получаем расходы группы с долями
  const { data: rawExpenses, error: expensesError } = await supabase
    .from("split_expenses")
    .select(
      `
      id,
      group_id,
      payer_id,
      amount,
      title,
      date,
      split_type,
      created_at,
      split_expense_shares (
        id,
        expense_id,
        member_id,
        amount,
        share_value
      )
    `,
    )
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (expensesError) {
    console.error("Ошибка загрузки расходов:", expensesError);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка загрузки расходов",
    });
  }

  const expenses: SplitExpense[] = (rawExpenses || []).map((e) => ({
    id: e.id,
    group_id: e.group_id,
    payer_id: e.payer_id,
    amount: Number(e.amount),
    title: e.title,
    date: e.date,
    split_type: e.split_type as "equal" | "exact" | "shares",
    created_at: e.created_at,
    payerName: memberNameMap.get(e.payer_id) || "Неизвестно",
    shares: (e.split_expense_shares || []).map((s) => ({
      id: s.id,
      expense_id: s.expense_id,
      member_id: s.member_id,
      amount: Number(s.amount),
      share_value: s.share_value !== null ? Number(s.share_value) : null,
      memberName: memberNameMap.get(s.member_id) || "Участник",
    })),
  }));

  // 4. Получаем взаиморасчеты (settlements)
  const { data: rawSettlements, error: settlementsError } = await supabase
    .from("split_settlements")
    .select(
      "id, group_id, from_member_id, to_member_id, amount, date, created_at",
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (settlementsError) {
    console.error("Ошибка загрузки расчетов:", settlementsError);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка загрузки расчетов",
    });
  }

  const settlements: SplitSettlement[] = (rawSettlements || []).map((s) => ({
    id: s.id,
    group_id: s.group_id,
    from_member_id: s.from_member_id,
    to_member_id: s.to_member_id,
    amount: Number(s.amount),
    date: s.date,
    created_at: s.created_at,
    fromMemberName: memberNameMap.get(s.from_member_id) || "Неизвестно",
    toMemberName: memberNameMap.get(s.to_member_id) || "Неизвестно",
  }));

  // 5. Вычисляем балансы и оптимизированные долги
  const balances = calculateMemberBalances(members, expenses, settlements);
  const optimizedDebts = simplifyDebts(balances);

  const currentMember = members.find((m) => m.is_current_user);
  const currentMemberBalance = currentMember
    ? (balances.find((b) => b.memberId === currentMember.id)?.netBalance ?? 0)
    : 0;

  const totalGroupSpending = roundCurrency(
    expenses.reduce((sum, e) => sum + e.amount, 0),
  );

  return {
    id: group.id,
    name: group.name,
    currency: group.currency,
    user_id: group.user_id,
    created_at: group.created_at,
    members,
    expenses,
    settlements,
    balances,
    optimizedDebts,
    userNetBalance: currentMemberBalance,
    totalGroupSpending,
  };
});
