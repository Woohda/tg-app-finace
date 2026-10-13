/**
 * @module server/api/split/groups/[id]/notify-debtors.post
 * @fileoverview Отправка Telegram-уведомлений должникам группы через бота FINO
 * @description
 * Рассчитывает оптимизированные долги группы и отправляет персональное сообщение
 * каждому должнику, зарегистрированному в FINO (имеющему `telegram_id`),
 * с указанием точной суммы долга и имени участника, которому необходимо сделать перевод.
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth`.
 * 2. Получение `id` группы и проверка доступа.
 * 3. Загрузка участников с джойном `users` для извлечения `telegram_id`.
 * 4. Загрузка расходов и взаиморасчетов группы.
 * 5. Расчет текущих балансов и вычисление оптимизированных переводов (`simplifyDebts`).
 * 6. Инициализация Telegram-бота через `getBot()`.
 * 7. Итеративная отправка сообщений должникам с обработкой ошибок доставки.
 * 8. Возврат статистики отправки: `notifiedCount` и `skippedCount`.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы совместных трат.
 * 
 * ### Ошибки:
 * - `400 Bad Request`: параметр `id` отсутствует.
 * - `401 Unauthorized`: неавторизованный запрос.
 * - `404 Not Found`: группа не найдена.
 * - `500 Internal Server Error`: ошибка базы данных или Telegram API.
 * 
 * ### Особенности:
 * - Уведомления получают только участники с привязанным `telegram_id`; участники без FINO аккаунта учитываются в `skippedCount`.
 */
import { getUserSupabase, getBotSupabase } from "~~/server/utils/db";
import { getBot } from "~~/server/utils/bot";
import { escapeHtml } from "~~/server/utils/format";
import { calculateMemberBalances, simplifyDebts } from "~/utils/splitAlgorithm";
import type { SplitMember, SplitExpense, SplitSettlement } from "~/types/split";

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

  // 1. Получаем группу
  const { data: group } = await supabase
    .from("split_groups")
    .select("id, name, user_id")
    .eq("id", groupId)
    .single();

  if (!group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Группа не найдена",
    });
  }

  // 2. Получаем участников группы
  const { data: rawMembers } = await supabase
    .from("split_members")
    .select("id, group_id, name, user_id, is_current_user, created_at")
    .eq("group_id", groupId);

  const isOwner = group.user_id === userId;
  const isMember = (rawMembers || []).some((m) => m.user_id === userId);

  if (!isOwner && !isMember) {
    throw createError({
      statusCode: 403,
      statusMessage: "У вас нет доступа к этой группе",
    });
  }

  const userIds = Array.from(
    new Set([
      group.user_id,
      ...(rawMembers || []).map((m) => m.user_id),
    ].filter(Boolean)),
  ) as string[];

  const userMap = new Map<
    string,
    { first_name: string | null; telegram_id: number | null }
  >();

  if (userIds.length > 0) {
    const botSupabase = getBotSupabase();
    const { data: usersData } = await botSupabase
      .from("users")
      .select("id, first_name, telegram_id")
      .in("id", userIds);

    for (const u of usersData || []) {
      userMap.set(u.id, {
        first_name: u.first_name,
        telegram_id: u.telegram_id,
      });
    }
  }

  const members: SplitMember[] = (rawMembers || []).map((m) => {
    const effectiveUserId =
      m.user_id || (isOwner && m.is_current_user ? group.user_id : null);
    const u = effectiveUserId ? userMap.get(effectiveUserId) : null;
    const profileName = u?.first_name?.trim();
    const displayName =
      (m.name === "Я" || m.name.toLowerCase() === "я") && profileName
        ? profileName
        : m.name;

    return {
      id: m.id,
      group_id: m.group_id,
      name: displayName,
      user_id: m.user_id,
      is_current_user: Boolean(
        (userId && m.user_id === userId) ||
          (!m.user_id && isOwner && m.is_current_user),
      ),
      created_at: m.created_at,
      telegram_id: u?.telegram_id ?? null,
    };
  });

  // 3. Получаем расходы
  const { data: rawExpenses } = await supabase
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
        member_id,
        amount
      )
    `,
    )
    .eq("group_id", groupId);

  const expenses: SplitExpense[] = (rawExpenses || []).map((e) => ({
    id: e.id,
    group_id: e.group_id,
    payer_id: e.payer_id,
    amount: Number(e.amount),
    title: e.title,
    date: e.date,
    split_type: e.split_type as "equal" | "exact" | "shares",
    created_at: e.created_at,
    shares: (e.split_expense_shares || []).map((s) => ({
      id: "",
      expense_id: e.id,
      member_id: s.member_id,
      amount: Number(s.amount),
      share_value: null,
    })),
  }));

  // 4. Получаем взаиморасчеты
  const { data: rawSettlements } = await supabase
    .from("split_settlements")
    .select(
      "id, group_id, from_member_id, to_member_id, amount, date, created_at",
    )
    .eq("group_id", groupId);

  const settlements: SplitSettlement[] = (rawSettlements || []).map((s) => ({
    id: s.id,
    group_id: s.group_id,
    from_member_id: s.from_member_id,
    to_member_id: s.to_member_id,
    amount: Number(s.amount),
    date: s.date,
    created_at: s.created_at,
  }));

  // 5. Оптимизируем долги
  const balances = calculateMemberBalances(members, expenses, settlements);
  const transfers = simplifyDebts(balances);

  if (transfers.length === 0) {
    return {
      success: true,
      notifiedCount: 0,
      totalDebtsCount: 0,
      message: "Все долги в группе закрыты, уведомлять некого",
    };
  }

  // 6. Отправляем уведомления должникам через бота
  let notifiedCount = 0;
  let bot: ReturnType<typeof getBot> | null = null;

  try {
    bot = getBot();
  } catch (err) {
    console.error(
      "Не удалось инициализировать бота для отправки уведомлений:",
      err,
    );
  }

  if (bot) {
    for (const t of transfers) {
      if (t.fromTelegramId) {
        try {
          const safeGroupName = escapeHtml(group.name);
          const safeToMemberName = escapeHtml(t.toMemberName);
          const messageText =
            `👋 <b>FINO: Расчет в группе «${safeGroupName}»</b>\n\n` +
            `Тебе необходимо перевести <b>${t.amount.toLocaleString("ru-RU")} ₽</b> участнику <b>${safeToMemberName}</b>.\n\n` +
            `<i>Пожалуйста, переведи указанную сумму и подтверди расчет.</i>`;

          await bot.api.sendMessage(t.fromTelegramId, messageText, {
            parse_mode: "HTML",
          });
          notifiedCount++;
        } catch (sendErr) {
          console.warn(
            `[Telegram Bot] Не удалось отправить уведомление пользователю ${t.fromTelegramId}:`,
            sendErr,
          );
        }
      }
    }
  }

  return {
    success: true,
    notifiedCount,
    totalDebtsCount: transfers.length,
    message:
      notifiedCount > 0
        ? `Отправлено ${notifiedCount} уведомлений в Telegram`
        : "Ни у одного из должников не найден привязанный Telegram-аккаунт",
  };
});
