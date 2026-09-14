/**
 * @module app/utils/zod
 * @fileoverview Вспомогательные утилиты для работы с Zod-ошибками на клиенте
 */
import type { ZodError } from "zod";

export function formatZodError(error: ZodError): string {
  if (error.issues.length > 0) {
    return error.issues[0]?.message || "Произошла ошибка валидации";
  }
  return "Произошла ошибка валидации";
}
