/**
 * @module server/api/friends/join.post
 * @fileoverview Присоединение по реферальной ссылке через WebApp (start_param)
 * @description
 * Обрабатывает вход пользователя по диплинку через Mini App (join_groupId или friend_userId).
 * Добавляет пользователя в друзья и, если ссылка в группу, добавляет в split_members.
 */
import { processInvitePayload } from "~~/server/utils/friends";
import type { JoinInviteResult } from "~/types/friends";

export default defineEventHandler(async (event): Promise<JoinInviteResult> => {
  const { userId } = await requireAuth(event);
  const body = await readBody(event);

  const startParam = typeof body?.startParam === "string" ? body.startParam.trim() : "";

  if (!startParam) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не передан параметр startParam",
    });
  }

  return await processInvitePayload(userId, startParam);
});
