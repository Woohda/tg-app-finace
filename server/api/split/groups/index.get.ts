/**
 * @module server/api/split/groups/index.get
 * @fileoverview Получение списка групп совместных трат пользователя
 * @description
 * Возвращает группы, в которых текущий пользователь является владельцем или участником.
 * Для каждой группы вычисляет сводные данные: число участников, суммарные расходы
 * и персональный чистый баланс пользователя (`userNetBalance`).
 * ---
 * ### Логика работы:
 * 1. Проверка авторизации через `requireAuth` и получение `userId`.
 * 2. Поиск групп, где пользователь является участником в `split_members`.
 * 3. Формирование запроса к `split_groups` с объединением по `user_id` и найденным `group_id`.
 * 4. Загрузка участников, расходов (с долями) и взаиморасчетов.
 * 5. Расчет персонального баланса в каждой группе с помощью `calculateMemberBalances`.
 * 6. Возврат списка объектов `SplitGroupSummary`.
 * 
 * ### Параметры запроса:
 * - Нет (параметры передаются через заголовок авторизации).
 * 
 * ### Ошибки:
 * - `401 Unauthorized`: пользователь не авторизован.
 * - `500 Internal Server Error`: ошибка выполнения запроса в Supabase.
 * 
 * ### Особенности:
 * - Выполняет единый реляционный запрос для оптимизации производительности при загрузке дашборда.
 */
import { getUserSupabase } from "~~/server/utils/db";
import { calculateMemberBalances, roundCurrency } from "~/utils/splitAlgorithm";
import type { SplitMember, SplitExpense, SplitSettlement } from "~/types/split";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  // Получаем группы, где пользователь владелец или участник
  const { data: userMemberGroups } = await supabase
    .from("split_members")
    .select("group_id")
    .eq("user_id", userId);

  const memberGroupIds = (userMemberGroups || []).map((m) => m.group_id);

  let query = supabase.from("split_groups").select(`
    id,
    name,
    currency,
    user_id,
    created_at,
    split_members (
      id,
      name,
      user_id,
      is_current_user,
      created_at
    ),
    split_expenses (
      id,
      payer_id,
      amount,
      split_expense_shares (
        member_id,
        amount
      )
    ),
    split_settlements (
      id,
      from_member_id,
      to_member_id,
      amount
    )
  `);

  if (memberGroupIds.length > 0) {
    query = query.or(
      `user_id.eq.${userId},id.in.(${memberGroupIds.join(",")})`,
    );
  } else {
    query = query.eq("user_id", userId);
  }

  const { data: groups, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Ошибка загрузки групп совместных трат:", error);
    throw createError({
      statusCode: 500,
      message: "Не удалось загрузить группы совместных трат",
      statusMessage: "Internal Server Error",
    });
  }

  return (groups || []).map((g) => {
    const rawMembers = (g.split_members || []) as unknown as SplitMember[];
    const currentMember = rawMembers.find(
      (m) =>
        (userId && m.user_id === userId) ||
        (!m.user_id && g.user_id === userId && m.is_current_user),
    );

    const rawExpenses = (g.split_expenses || []).map((e) => ({
      id: e.id,
      group_id: g.id,
      payer_id: e.payer_id,
      amount: Number(e.amount),
      title: "",
      date: "",
      split_type: "equal" as const,
      created_at: "",
      shares: (
        (e.split_expense_shares || []) as {
          member_id: string;
          amount: number;
        }[]
      ).map((s) => ({
        id: "",
        expense_id: e.id,
        member_id: s.member_id,
        amount: Number(s.amount),
        share_value: null,
      })),
    })) as SplitExpense[];

    const rawSettlements = (g.split_settlements || []).map((s) => ({
      id: s.id,
      group_id: g.id,
      from_member_id: s.from_member_id,
      to_member_id: s.to_member_id,
      amount: Number(s.amount),
      date: "",
      created_at: "",
    })) as SplitSettlement[];

    const balances = calculateMemberBalances(
      rawMembers,
      rawExpenses,
      rawSettlements,
    );

    const userBalanceItem = currentMember
      ? balances.find((b) => b.memberId === currentMember.id)
      : null;

    const totalExpenses = rawExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      id: g.id,
      name: g.name,
      currency: g.currency,
      user_id: g.user_id,
      created_at: g.created_at,
      membersCount: rawMembers.length,
      totalExpenses: roundCurrency(totalExpenses),
      userNetBalance: userBalanceItem ? userBalanceItem.netBalance : 0,
    };
  });
});
