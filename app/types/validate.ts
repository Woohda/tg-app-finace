/**
 * @module app/types/validate
 * @fileoverview Единый реестр Zod-схем для валидации данных во всем приложении
 * @description
 * Этот файл содержит схемы валидации для категорий, транзакций и бюджетов.
 * Схемы используются как на клиенте (для валидации форм), так и на сервере
 * (для проверки входящих данных API с помощью `readValidatedBody`).
 */
import { z } from "zod";

// --- Categories ---
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Введите название категории")
    .max(50, "Название слишком длинное"),
  icon: z.string().max(10, "Иконка слишком длинная").optional().nullable(),
  type: z.enum(["expense", "income"]),
});

export const categoryUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Введите название категории")
    .max(50, "Название слишком длинное"),
  icon: z.string().max(10, "Иконка слишком длинная").optional().nullable(),
});

// --- Transactions ---
// Для фронтенда (где используется camelCase для полей формы)
export const transactionFrontendSchema = z.object({
  amount: z.number().positive("Введите корректную сумму"),
  categoryId: z.string().min(1, "Выберите категорию"),
  date: z.string().min(1, "Выберите дату"),
  type: z.enum(["expense", "income"]),
  description: z.string().optional(),
});

// Для бэкенда (где используется snake_case для базы данных)
export const transactionBackendSchema = z.object({
  amount: z.number().positive("Некорректная сумма"),
  category_id: z.string().min(1, "Не указана категория"),
  type: z.enum(["income", "expense"]),
  date: z.string().min(1, "Не указана дата"),
  description: z.string().optional().nullable(),
});

export const transactionPatchSchema = z
  .object({
    amount: z.number().positive("Некорректная сумма").optional(),
    category_id: z.string().min(1, "Не указана категория").optional(),
    type: z.enum(["income", "expense"]).optional(),
    date: z.string().min(1, "Не указана дата").optional(),
    description: z.string().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Нет данных для обновления",
  });

// --- Budgets ---
export const budgetSchema = z.object({
  amount: z.number().positive("Бюджет должен быть больше 0"),
});

// --- AI ---
export const parseReceiptSchema = z.object({
  image: z.string().min(1, "Изображение не предоставлено"), // base64
});
