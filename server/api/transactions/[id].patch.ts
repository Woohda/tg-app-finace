/**
 * @module server/api/transactions/[id].patch
 * @fileoverview Обновление транзакции по ID
 * @description
 * Позволяет обновить одно или несколько полей транзакции.
 * Ownership: обновляются только транзакции текущего пользователя.
 */
import { serverSupabaseServiceRole } from "#supabase/server";
import type { Database } from "~/types/database.types";
import { transactionPatchSchema } from "~/types/validate";

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event);
  const supabase = serverSupabaseServiceRole<Database>(event);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Не указан ID транзакции",
    });
  }

  const body = await readValidatedBody(event, (body) =>
    transactionPatchSchema.safeParse(body),
  );

  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: body.error.issues[0]?.message || "Ошибка валидации данных",
      data: body.error.issues,
    });
  }

  const { amount, category_id, type, date, name } = body.data;

  // Собираем объект обновления
  const updateData: Database["public"]["Tables"]["transactions"]["Update"] = {};
  if (amount !== undefined) updateData.amount = amount;
  if (category_id !== undefined) updateData.category_id = category_id;
  if (type !== undefined) updateData.type = type;
  if (date !== undefined) updateData.date = date;
  if (name !== undefined) updateData.name = name || null;

  const { data, error } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select(
      `
      id,
      amount,
      type,
      name,
      date,
      created_at,
      categories (
        id,
        name,
        icon
      )
    `,
    )
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      throw createError({
        statusCode: 404,
        statusMessage: "Транзакция не найдена",
      });
    }
    console.error("Ошибка обновления транзакции:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Ошибка при обновлении транзакции",
    });
  }

  const cat = Array.isArray(data.categories)
    ? data.categories[0]
    : data.categories;
  return {
    id: data.id,
    amount: data.amount,
    type: data.type,
    name: data.name,
    date: data.date,
    categoryId: cat?.id || "",
    categoryName: cat?.name || "Неизвестно",
    categoryIcon: cat?.icon || "💸",
  };
});
