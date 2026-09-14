/**
 * @module server/api/categories/[id].put
 * @fileoverview Серверный обработчик PUT-запроса для редактирования категории
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";
import { categoryUpdateSchema } from "~/types/validate";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID категории",
    });
  }

  const body = await readValidatedBody(event, (body) => categoryUpdateSchema.safeParse(body));
  
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { name, icon } = body.data;

  const supabase = serverSupabaseServiceRole<Database>(event);

  // Обновляем только если категория принадлежит пользователю
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: name.trim(),
      icon: icon ?? null,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, name, type, icon, user_id, created_at")
    .single();

  if (error) {
    console.error("Ошибка обновления категории:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка базы данных",
    });
  }

  return data;
});
