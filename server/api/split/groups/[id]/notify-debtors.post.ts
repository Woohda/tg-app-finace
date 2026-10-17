/**
 * @module server/api/split/groups/[id]/notify-debtors.post
 * @fileoverview Отправка персонального Telegram-напоминания должнику через бота FINO
 * @description
 * Направляет персональное сообщение конкретному должнику группы в Telegram
 * с указанием точной суммы перевода и имени участника-получателя (кредитора).
 * Отправка разрешена только получателю перевода (кредитору) либо владельцу группы.
 * Кулдаун 24 часа действует строго индивидуально для каждого перевода.
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth`.
 * 2. Получение `id` группы и валидация тела запроса `{ fromMemberId, toMemberId }`.
 * 3. Загрузка данных группы и участников.
 * 4. Проверка прав (только кредитор или владелец).
 * 5. Проверка 24-часового персонального кулдауна для пары (должник -> кредитор).
 * 6. Расчет оптимизированных долгов (`simplifyDebts`) и поиск перевода.
 * 7. Отправка персонального Telegram-сообщения должнику через бота.
 * 8. Фиксация времени отправки в сервере для кулдауна.
 */
import { getUserSupabase, getBotSupabase } from "~~/server/utils/db";
import { getBot } from "~~/server/utils/bot";
import { escapeHtml } from "~~/server/utils/format";
import {
  getSplitDebtorNotificationCooldown,
  recordSplitDebtorNotification,
} from "~~/server/utils/splitNotification";
import { calculateMemberBalances, simplifyDebts } from "~/utils/splitAlgorithm";
import type { SplitMember, SplitExpense, SplitSettlement } from "~/types/split";

interface NotifyDebtorsBody {
  fromMemberId: string;
  toMemberId: string;
}

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const groupId = getRouterParam(event, "id");
  const body = await readBody<NotifyDebtorsBody>(event).catch(() => null);

  if (!groupId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID группы",
    });
  }

  if (!body?.fromMemberId || !body?.toMemberId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указаны участники перевода для напоминания",
    });
  }

  const supabase = getUserSupabase(token);

  // 1. Получаем группу
  const { data: group, error: groupError } = await supabase
    .from("split_groups")
    .select("id, name, user_id")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw createError({
      statusCode: 404,
      statusMessage: "Группа не найдена",
    });
  }

  // 2. Проверяем индивидуальный кулдаун (24 часа)
  const { isCooldown, remainingHours, remainingMinutes } =
    getSplitDebtorNotificationCooldown(
      groupId,
      body.fromMemberId,
      body.toMemberId,
    );

  if (isCooldown) {
    const cooldownTime =
      remainingHours > 0 ? `${remainingHours} ч.` : `${remainingMinutes} мин.`;
    throw createError({
      statusCode: 429,
      statusMessage: `Напоминание этому должнику можно отправлять не чаще одного раза в сутки. Повтор будет доступен через ${cooldownTime}`,
    });
  }

  // 3. Получаем участников группы
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

  // Только получатель перевода (кредитор) или создатель группы может отправить напоминание
  const currentMember = (rawMembers || []).find((m) => m.user_id === userId);
  const isCreditor = currentMember?.id === body.toMemberId;
  if (!isCreditor && !isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage:
        "Только участник, которому предназначен перевод, может отправлять напоминание",
    });
  }

  const userIds = Array.from(
    new Set(
      [group.user_id, ...(rawMembers || []).map((m) => m.user_id)].filter(
        Boolean,
      ),
    ),
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
    const isCurrentUser = Boolean(
      (userId && m.user_id === userId) ||
        (!m.user_id && isOwner && m.is_current_user),
    );
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
      is_current_user: isCurrentUser,
      created_at: m.created_at,
      telegram_id: u?.telegram_id ?? null,
    };
  });

  const memberNameMap = new Map<string, string>();
  for (const m of members) {
    memberNameMap.set(m.id, m.name);
  }

  // 4. Получаем расходы и расчеты
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
    .eq("group_id", groupId);

  if (expensesError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка загрузки расходов группы",
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

  const { data: rawSettlements, error: settlementsError } = await supabase
    .from("split_settlements")
    .select(
      "id, group_id, from_member_id, to_member_id, amount, date, created_at",
    )
    .eq("group_id", groupId);

  if (settlementsError) {
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка загрузки расчетов группы",
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

  // 5. Расчет текущих долгов
  const balances = calculateMemberBalances(members, expenses, settlements);
  const transfers = simplifyDebts(balances);

  // Ищем конкретный перевод, по которому запрошено напоминание
  const targetTransfer = transfers.find(
    (t) =>
      t.fromMemberId === body.fromMemberId &&
      t.toMemberId === body.toMemberId,
  );

  if (!targetTransfer) {
    return {
      success: true,
      notified: false,
      message: "Указанный долг уже закрыт или не найден",
    };
  }

  if (!targetTransfer.fromTelegramId) {
    return {
      success: true,
      notified: false,
      message: "У должника не найден привязанный Telegram-аккаунт",
    };
  }

  // 6. Отправляем персональное сообщение в Telegram через бота
  let bot: ReturnType<typeof getBot> | null = null;
  try {
    bot = getBot();
  } catch (err) {
    console.error(
      "Не удалось инициализировать бота для отправки уведомлений:",
      err,
    );
  }

  if (!bot) {
    throw createError({
      statusCode: 500,
      statusMessage: "Сервис Telegram-бота временно недоступен",
    });
  }

  const safeGroupName = escapeHtml(group.name);
  const safeToMemberName = escapeHtml(targetTransfer.toMemberName);
  const messageText =
    `👋 <b>FINO: Расчет в группе «${safeGroupName}»</b>\n\n` +
    `Тебе необходимо перевести <b>${targetTransfer.amount.toLocaleString("ru-RU")} ₽</b> участнику <b>${safeToMemberName}</b>.\n\n` +
    `<i>Пожалуйста, переведи указанную сумму и подтверди расчет.</i>`;

  await bot.api.sendMessage(targetTransfer.fromTelegramId, messageText, {
    parse_mode: "HTML",
  });

  const now = Date.now();
  recordSplitDebtorNotification(
    groupId,
    body.fromMemberId,
    body.toMemberId,
    now,
  );

  return {
    success: true,
    notified: true,
    notifiedAt: new Date(now).toISOString(),
    message: "Напоминание успешно отправлено должнику в Telegram",
  };
});
