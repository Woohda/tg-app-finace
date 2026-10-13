/**
 * @module server/api/friends/index.get
 * @fileoverview Получение списка друзей текущего пользователя
 * @description
 * Возвращает всех друзей пользователя из таблицы `user_friends` с их именами и Telegram ID.
 * Используется в модалках сплита для быстрого выбора участников.
 */
import { getUserSupabase, getBotSupabase } from "~~/server/utils/db";
import type { UserFriend } from "~/types/friends";

export default defineEventHandler(async (event): Promise<UserFriend[]> => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  // 1. Получаем список связей друзей для текущего пользователя
  const { data: friendships, error: friendsError } = await supabase
    .from("user_friends")
    .select("id, friend_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (friendsError) {
    console.error("Ошибка загрузки списка друзей:", friendsError);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось загрузить список друзей",
    });
  }

  if (!friendships || friendships.length === 0) {
    return [];
  }

  const friendIds = Array.from(new Set(friendships.map((f) => f.friend_id)));

  // 2. Загружаем профили друзей через сервисный клиент (в обход RLS)
  const botSupabase = getBotSupabase();
  const { data: usersData, error: usersError } = await botSupabase
    .from("users")
    .select("id, first_name, telegram_id")
    .in("id", friendIds);

  if (usersError) {
    console.error("Ошибка загрузки профилей друзей:", usersError);
  }

  const userMap = new Map((usersData || []).map((u) => [u.id, u]));

  return friendships.map((f) => {
    const u = userMap.get(f.friend_id);
    return {
      id: f.id,
      user_id: f.friend_id,
      first_name: u?.first_name?.trim() || "Друг",
      telegram_id: u?.telegram_id ?? null,
      created_at: f.created_at,
    };
  });
});
