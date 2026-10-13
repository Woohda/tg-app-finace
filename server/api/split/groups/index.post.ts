/**
 * @module server/api/split/groups/index.post
 * @fileoverview Создание новой группы совместных трат
 * @description
 * Создает запись в таблице `split_groups`, автоматически добавляет текущего пользователя
 * в качестве первого участника (`is_current_user: true`) и сохраняет список начальных участников.
 * ---
 * ### Логика работы:
 * 1. Проверка аутентификации через `requireAuth` и получение `userId`.
 * 2. Валидация входных данных через Zod (`createSplitGroupSchema`).
 * 3. Извлечение имени текущего пользователя из профиля `users`.
 * 4. Создание записи группы в таблице `split_groups`.
 * 5. Добавление текущего пользователя в качестве участника `split_members`.
 * 6. Пакетное добавление указанных начальных участников (`initialMembers`).
 * 7. Загрузка и возврат полной записи созданной группы.
 *
 * ### Параметры запроса:
 * - `name` (body, string) — название группы (например, «Поездка на море»).
 * - `initialMembers` (body, string[], optional) — массив имен начальных участников.
 *
 * ### Ошибки:
 * - `400 Bad Request`: ошибка валидации Zod (пустое или слишком длинное название).
 * - `401 Unauthorized`: неавторизованный запрос.
 * - `500 Internal Server Error`: ошибка вставки данных в Supabase.
 *
 * ### Особенности:
 * - Автоматически гарантирует, что создатель группы всегда присутствует в списке участников под своим именем из Telegram.
 */
import { createSplitGroupSchema } from "~/types/validate";
import { getUserSupabase, getBotSupabase } from "~~/server/utils/db";
import { addMutualFriendship } from "~~/server/utils/friends";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const supabase = getUserSupabase(token);

  const body = await readValidatedBody(event, (data) =>
    createSplitGroupSchema.safeParse(data),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { name, initialMembers } = body.data;

  // 1. Получаем реальное имя (first_name) текущего пользователя через сервисный клиент (в обход RLS)
  const botSupabase = getBotSupabase();
  const { data: userProfile } = await botSupabase
    .from("users")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle();

  const currentUserName = userProfile?.first_name?.trim() || "Я";

  // 2. Создаем группу
  const { data: group, error: groupError } = await supabase
    .from("split_groups")
    .insert({
      user_id: userId,
      name: name.trim(),
    })
    .select()
    .single();

  if (groupError || !group) {
    console.error("Ошибка создания группы совместных трат:", groupError);
    throw createError({
      statusCode: 500,
      message: "Не удалось создать группу",
      statusMessage: "Internal Server Error",
    });
  }

  // 3. Добавляем участников: создатель + начальные участники
  const membersToInsert: {
    group_id: string;
    name: string;
    user_id: string | null;
    is_current_user: boolean;
  }[] = [
    {
      group_id: group.id,
      name: currentUserName,
      user_id: userId,
      is_current_user: true,
    },
  ];

  if (Array.isArray(initialMembers)) {
    for (const member of initialMembers) {
      const memberName = typeof member === "string" ? member : member.name;
      const memberUserId =
        typeof member === "object" && member.user_id ? member.user_id : null;
      const trimmed = memberName.trim();
      if (trimmed && trimmed.toLowerCase() !== currentUserName.toLowerCase()) {
        membersToInsert.push({
          group_id: group.id,
          name: trimmed,
          user_id: memberUserId,
          is_current_user: false,
        });

        // Если участник привязан к пользователю FINO, гарантируем взаимную связь в друзьях
        if (memberUserId && memberUserId !== userId) {
          addMutualFriendship(userId, memberUserId).catch(() => {});
        }
      }
    }
  }

  const { error: membersError } = await supabase
    .from("split_members")
    .insert(membersToInsert);

  if (membersError) {
    console.error("Ошибка добавления участников группы:", membersError);
    throw createError({
      statusCode: 500,
      message: "Группа создана, но произошла ошибка при добавлении участников",
      statusMessage: "Internal Server Error",
    });
  }

  return {
    id: group.id,
    name: group.name,
    currency: group.currency,
  };
});
