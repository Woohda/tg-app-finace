/**
 * @module app/utils/zod
 * @fileoverview Вспомогательные утилиты для работы с Zod-ошибками на клиенте
 */
import type { ZodError } from "zod";

export function formatZodError(error: ZodError): string {
  if (error.issues.length > 0) {
    const msg = error.issues[0]?.message;
    if (
      msg &&
      (msg.toLowerCase().includes("nan") ||
        msg.toLowerCase().includes("expected number"))
    ) {
      return "Введите корректную сумму";
    }
    return msg || "Произошла ошибка валидации";
  }
  return "Произошла ошибка валидации";
}
