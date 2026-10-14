/**
 * @module server/utils/friends
 * @fileoverview Сервисные функции для системы друзей и присоединения к группам по инвайт-ссылкам
 */
import { getBotSupabase } from "./db";
import { getBot } from "./bot";
import { escapeHtml } from "./format";
import type { JoinInviteResult } from "~/types/friends";

/**
 * Добавляет взаимную дружбу между двумя пользователями в таблицу user_friends
 */
export async function addMutualFriendship(
  userIdA: string,
  userIdB: string,
): Promise<boolean> {
  if (!userIdA || !userIdB || userIdA === userIdB) {
    return false;
  }

  const supabase = getBotSupabase();

  try {
    const { error } = await supabase.from("user_friends").upsert(
      [
        { user_id: userIdA, friend_id: userIdB },
        { user_id: userIdB, friend_id: userIdA },
      ],
      { onConflict: "user_id, friend_id", ignoreDuplicates: true },
    );

    if (error) {
      console.warn("[user_friends] Ошибка добавления в друзья:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[user_friends] Исключение при добавлении в друзья:", err);
    return false;
  }
}

/**
 * Обрабатывает присоединение пользователя по реферальному коду (join_... или friend_...)
 */
export async function processInvitePayload(
  joiningUserId: string,
  payload: string,
): Promise<JoinInviteResult> {
  const trimmed = payload?.trim() || "";
  if (!trimmed || !joiningUserId) {
    return { success: false, message: "Не указан код приглашения" };
  }

  const supabase = getBotSupabase();

  // 1. Загружаем профиль присоединившегося пользователя
  const { data: joiningUser } = await supabase
    .from("users")
    .select("id, first_name, telegram_id")
    .eq("id", joiningUserId)
    .maybeSingle();

  if (!joiningUser) {
    return { success: false, message: "Пользователь не найден" };
  }

  const joiningName = joiningUser.first_name?.trim() || "Друг";

  // Сценарий А: Инвайт в группу совместных трат (join_groupId или join_groupId_inviterId)
  if (trimmed.startsWith("join_")) {
    const parts = trimmed.replace(/^join_/, "").split("_");
    const groupId = parts[0];
    const explicitInviterId = parts[1];

    if (!groupId) {
      return { success: false, message: "Некорректная ссылка на группу" };
    }

    // Загружаем группу
    const { data: group } = await supabase
      .from("split_groups")
      .select("id, name, user_id")
      .eq("id", groupId)
      .maybeSingle();

    if (!group) {
      return { success: false, message: "Группа не найдена или была удалена" };
    }

    // Загружаем участников группы
    const { data: existingMembers } = await supabase
      .from("split_members")
      .select("id, name, user_id")
      .eq("group_id", groupId);

    // Защита от подделки inviterId: доверяем explicitInviterId ТОЛЬКО если он состоит в группе
    const isExplicitInviterValid =
      Boolean(explicitInviterId) &&
      (group.user_id === explicitInviterId ||
        (existingMembers || []).some((m) => m.user_id === explicitInviterId));

    const inviterId = isExplicitInviterValid ? explicitInviterId : group.user_id;

    // Добавляем в друзья с проверенным пригласившим/создателем
    if (inviterId && inviterId !== joiningUserId) {
      await addMutualFriendship(inviterId, joiningUserId);
    }

    const alreadyMember = (existingMembers || []).some(
      (m) => m.user_id === joiningUserId,
    );

    if (!alreadyMember) {
      await supabase.from("split_members").insert({
        group_id: groupId,
        name: joiningName,
        user_id: joiningUserId,
        is_current_user: false,
      });

      // Отправляем уведомление пригласившему в Telegram
      if (inviterId && inviterId !== joiningUserId) {
        notifyInviterAboutJoin(inviterId, joiningName, group.name);
      }
    }

    return {
      success: true,
      groupId: group.id,
      groupName: group.name,
      message: `Вы присоединились к группе «${group.name}»`,
    };
  }

  // Сценарий Б: Инвайт просто в друзья (friend_inviterId)
  if (trimmed.startsWith("friend_")) {
    const inviterId = trimmed.replace(/^friend_/, "");
    if (!inviterId || inviterId === joiningUserId) {
      return {
        success: false,
        message: "Нельзя добавить самого себя в друзья",
      };
    }

    const { data: inviterUser } = await supabase
      .from("users")
      .select("id, first_name")
      .eq("id", inviterId)
      .maybeSingle();

    if (!inviterUser) {
      return {
        success: false,
        message: "Пригласивший пользователь не найден",
      };
    }

    await addMutualFriendship(inviterId, joiningUserId);
    notifyInviterAboutFriend(inviterId, joiningName);

    const inviterName = inviterUser.first_name?.trim() || "пользователем";

    return {
      success: true,
      friendName: inviterName,
      message: `Вы теперь друзья с ${inviterName}!`,
    };
  }

  return { success: false, message: "Неизвестный тип приглашения" };
}

/**
 * Фоновое уведомление создателя группы о новом участнике
 */
async function notifyInviterAboutJoin(
  inviterId: string,
  joiningName: string,
  groupName: string,
): Promise<void> {
  try {
    const supabase = getBotSupabase();
    const { data: inviter } = await supabase
      .from("users")
      .select("telegram_id")
      .eq("id", inviterId)
      .maybeSingle();

    if (inviter?.telegram_id) {
      const bot = getBot();
      const safeJoiningName = escapeHtml(joiningName);
      const safeGroupName = escapeHtml(groupName);
      await bot.api.sendMessage(
        inviter.telegram_id,
        `👋 <b>${safeJoiningName}</b> присоединился к вашей группе совместных трат <b>«${safeGroupName}»</b> и добавлен в список друзей!`,
        { parse_mode: "HTML" },
      );
    }
  } catch (err) {
    console.warn("[notifyInviterAboutJoin] Ошибка отправки уведомления:", err);
  }
}

/**
 * Фоновое уведомление пригласившего о новом друге
 */
async function notifyInviterAboutFriend(
  inviterId: string,
  joiningName: string,
): Promise<void> {
  try {
    const supabase = getBotSupabase();
    const { data: inviter } = await supabase
      .from("users")
      .select("telegram_id")
      .eq("id", inviterId)
      .maybeSingle();

    if (inviter?.telegram_id) {
      const bot = getBot();
      const safeJoiningName = escapeHtml(joiningName);
      await bot.api.sendMessage(
        inviter.telegram_id,
        `🎉 <b>${safeJoiningName}</b> принял ваше приглашение и добавлен в список ваших друзей в FINO!`,
        { parse_mode: "HTML" },
      );
    }
  } catch (err) {
    console.warn(
      "[notifyInviterAboutFriend] Ошибка отправки уведомления:",
      err,
    );
  }
}
