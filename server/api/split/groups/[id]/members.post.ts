/**
 * @module server/api/split/groups/[id]/members.post
 * @fileoverview Добавление нового участника в группу совместных трат
 * @description
 * Добавляет участника в группу `split_members`. Если указан Telegram username,
 * выполняет поиск зарегистрированного пользователя в базе FINO и привязывает `user_id`,
 * что позволяет боту отправлять персонализированные уведомления о взаиморасчетах.
 * ---
 * ### Логика работы:
 * 1. Проверка авторизации через `requireAuth`.
 * 2. Получение `id` группы и валидация тела запроса через `addSplitMemberSchema`.
 * 3. Проверка существования группы в `split_groups`.
 * 4. Очистка username (удаление символа `@` и приведение к нижнему регистру).
 * 5. Поиск пользователя в `users` через сервисный клиент `getBotSupabase`.
 * 6. Создание записи в `split_members`.
 * 7. Возврат созданного участника.
 * 
 * ### Параметры запроса:
 * - `id` (route param) — UUID группы.
 * - `name` (body, string) — отображаемое имя участника в группе.
 * - `telegram_username` (body, string, optional) — юзернейм в Telegram (например, `@username`).
 * 
 * ### Ошибки:
 * - `400 Bad Request`: отсутствуют параметры или данные не прошли валидацию Zod.
 * - `401 Unauthorized`: неавторизованный запрос.
 * - `404 Not Found`: группа не найдена.
 * - `500 Internal Server Error`: ошибка сохранения участника в Supabase.
 * 
 * ### Особенности:
 * - Поиск по Telegram username использует служебный Supabase клиент с правами чтения таблицы пользователей.
 */
import { addSplitMemberSchema } from "~/types/validate";
import { getUserSupabase, getBotSupabase } from "~~/server/utils/db";

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

  // Проверяем доступ к группе
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
    addSplitMemberSchema.safeParse(data),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { name, telegram_username } = body.data;
  const trimmedName = name.trim();

  let linkedUserId: string | null = null;
  let linkedTelegramId: number | null = null;

  if (telegram_username && telegram_username.trim()) {
    const cleanUsername = telegram_username.trim().replace(/^@/, "");
    const botSupabase = getBotSupabase();
    const { data: foundUser } = await botSupabase
      .from("users")
      .select("id, telegram_id")
      .ilike("username", cleanUsername)
      .maybeSingle();

    if (foundUser) {
      linkedUserId = foundUser.id;
      linkedTelegramId = foundUser.telegram_id;
    }
  }

  // Проверяем на дубликаты участников в группе
  const { data: existingMembers } = await supabase
    .from("split_members")
    .select("id, name, user_id")
    .eq("group_id", groupId);

  const duplicateName = (existingMembers || []).some(
    (m) => m.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );

  if (duplicateName) {
    throw createError({
      statusCode: 400,
      statusMessage: "Участник с таким именем уже есть в группе",
    });
  }

  if (linkedUserId) {
    const duplicateUser = (existingMembers || []).some(
      (m) => m.user_id === linkedUserId,
    );

    if (duplicateUser) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Пользователь с этим Telegram-аккаунтом уже добавлен в группу",
      });
    }
  }

  const { data: member, error } = await supabase
    .from("split_members")
    .insert({
      group_id: groupId,
      name: trimmedName,
      user_id: linkedUserId,
      is_current_user: false,
    })
    .select()
    .single();

  if (error || !member) {
    console.error("Ошибка добавления участника:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Не удалось добавить участника",
    });
  }

  return {
    ...member,
    telegram_id: linkedTelegramId,
  };
});
