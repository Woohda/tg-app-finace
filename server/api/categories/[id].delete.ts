/**
 * @module server/api/categories/[id].delete
 * @fileoverview Серверный обработчик DELETE-запроса для удаления категории
 * @description
 * Эндпоинт удаляет пользовательскую категорию по её ID.
 * Блокирует удаление (HTTP 409), если к категории уже привязаны транзакции.
 * ---
 * ### Логика работы:
 * 1. `Authentication`: Проверка JWT токена и извлечение `userId`.
 * 2. `Validation`: Извлечение `id` из параметров роута.
 * 3. `Dependency Check`: Проверка наличия связанных транзакций в БД.
 * 4. `Deletion`: Удаление категории, если она принадлежит текущему пользователю.
 *
 * ### Параметры запроса:
 * - `id` (в URL) — идентификатор удаляемой категории.
 *
 * ### Ошибки:
 * - `400 Bad Request`: Не указан ID или к категории привязаны транзакции (нарушение foreign key).
 * - `401 Unauthorized`: Отсутствует или недействителен JWT токен.
 * - `500 Internal Server Error`: Ошибка базы данных.
 */

import { getUserSupabase } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  const { userId, token } = await requireAuth(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID категории",
    });
  }

  const supabase = getUserSupabase(token);

  // 1. Проверяем наличие связанных транзакций
  const { data: existingTx, error: txError } = await supabase
    .from("transactions")
    .select("id")
    .eq("category_id", id)
    .eq("user_id", userId)
    .limit(1);

  if (txError) {
    console.error("Ошибка при проверке транзакций:", txError);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при проверке транзакций",
    });
  }

  if (existingTx && existingTx.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Невозможно удалить категорию, так как с ней связаны транзакции. Сначала удалите их или перенесите в другую категорию.",
    });
  }

  // 2. Проверяем наличие связанных регулярных платежей (подписок)
  const { data: existingSubs, error: subsError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("category_id", id)
    .eq("user_id", userId)
    .limit(1);

  if (subsError) {
    console.error("Ошибка при проверке подписок:", subsError);
  } else if (existingSubs && existingSubs.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Невозможно удалить категорию: к ней привязаны регулярные платежи. Сначала измените категорию в подписках.",
    });
  }

  // 3. Проверяем наличие связанных целей бюджета
  const { data: existingGoals, error: goalsError } = await supabase
    .from("category_goals")
    .select("id")
    .eq("category_id", id)
    .eq("user_id", userId)
    .limit(1);

  if (goalsError) {
    console.error("Ошибка при проверке целей бюджета:", goalsError);
  } else if (existingGoals && existingGoals.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Невозможно удалить категорию: для неё настроен лимит бюджета в целях.",
    });
  }

  // Удаляем только если категория принадлежит пользователю
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Ошибка удаления категории:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return { success: true };
});
