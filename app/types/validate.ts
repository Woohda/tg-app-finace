/**
 * @module app/types/validate
 * @fileoverview Единый реестр Zod-схем для валидации данных во всем приложении
 * @description
 * Этот файл содержит схемы валидации для категорий, транзакций, бюджетов,
 * подписок, целей трат по категориям и совместных расходов (Splitwise).
 * Схемы используются как на клиенте (для валидации форм), так и на сервере (для проверки входящих данных API).
 */
import { z } from "zod";
import { capitalizeFirstLetter } from "../utils/format";

// --- Categories ---
export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(1, "Введите название категории")
    .max(50, "Название слишком длинное")
    .transform((val) => capitalizeFirstLetter(val)),
  icon: z.string().min(1, "Выберите эмодзи").max(10, "Иконка слишком длинная"),
  type: z.enum(["expense", "income"]),
});

export const categoryUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Введите название категории")
    .max(50, "Название слишком длинное")
    .transform((val) => capitalizeFirstLetter(val)),
  icon: z.string().min(1, "Выберите эмодзи").max(10, "Иконка слишком длинная"),
});

// --- Transactions ---
export const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z
    .number("Введите корректную сумму")
    .positive("Сумма должна быть больше 0"),
  category_id: z.string().min(1, "Выберите категорию"),
  date: z.string().min(1, "Выберите дату"),
  type: z.enum(["expense", "income"]),
  name: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? capitalizeFirstLetter(val) : val)),
});

export const transactionPatchSchema = z
  .object({
    amount: z
      .number("Некорректная сумма")
      .positive("Некорректная сумма")
      .optional(),
    category_id: z.string().min(1, "Не указана категория").optional(),
    type: z.enum(["income", "expense"]).optional(),
    date: z.string().min(1, "Не указана дата").optional(),
    name: z
      .string()
      .optional()
      .nullable()
      .transform((val) =>
        val && val.trim() ? capitalizeFirstLetter(val) : val,
      ),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Нет данных для обновления",
  });

// --- Budgets ---
export const budgetSchema = z.object({
  amount: z
    .number("Введите корректную сумму")
    .positive("Бюджет должен быть больше 0"),
});

// --- AI ---
export const parseReceiptSchema = z.object({
  image: z
    .string()
    .min(1, "Изображение не предоставлено")
    .max(10_000_000, "Размер изображения превышает лимит (до 7 МБ)"),
  currentDate: z.string().optional(),
});

export const bulkTransactionSchema = z.object({
  transactions: z.array(transactionSchema),
});

// --- Subscriptions ---
export const subscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(1, "Введите название платежа")
    .max(100, "Название слишком длинное"),
  amount: z
    .number("Введите корректную сумму")
    .positive("Введите корректную сумму"),
  day_of_month: z
    .number("День должен быть числом")
    .int("День должен быть целым числом")
    .min(1, "День должен быть от 1 до 31")
    .max(31, "День должен быть от 1 до 31"),
  category_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const subscriptionUpdateSchema = subscriptionSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Нет данных для обновления",
  });

// --- Category Goals ---
export const categoryGoalSchema = z.object({
  categoryId: z.string().uuid("Некорректный ID категории"),
  targetAmount: z
    .number("Введите корректную сумму")
    .positive("Цель должна быть больше 0")
    .max(100_000_000, "Слишком большая сумма"),
});

export type CategoryGoalInput = z.infer<typeof categoryGoalSchema>;

// --- Split ---
export const createSplitGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Введите название группы")
    .max(80, "Название слишком длинное"),
  initialMembers: z
    .array(z.string().min(1, "Имя участника не может быть пустым").max(50))
    .min(1, "Добавьте хотя бы одного участника")
    .optional(),
});

export const addSplitMemberSchema = z.object({
  name: z
    .string()
    .min(1, "Введите имя участника")
    .max(50, "Имя слишком длинное"),
  telegram_username: z.string().optional().nullable(),
});

export const expenseShareInputSchema = z.object({
  member_id: z.string().uuid("Некорректный ID участника"),
  amount: z
    .number()
    .nonnegative("Сумма не может быть отрицательной")
    .optional()
    .nullable(),
  share_value: z
    .number()
    .positive("Доля должна быть больше 0")
    .optional()
    .nullable(),
  is_fixed: z.boolean().optional(),
});

export const addSplitExpenseSchema = z.object({
  title: z
    .string()
    .min(1, "Введите название расхода")
    .max(120, "Название слишком длинное"),
  amount: z.number().positive("Сумма должна быть больше 0"),
  payer_id: z.string().uuid("Выберите, кто оплатил"),
  date: z.string().optional(),
  split_type: z.enum(["equal", "exact", "shares"]),
  shares: z
    .array(expenseShareInputSchema)
    .min(1, "Выберите участников расхода"),
});

export const addSplitSettlementSchema = z.object({
  from_member_id: z.string().uuid("Выберите должника"),
  to_member_id: z.string().uuid("Выберите получателя"),
  amount: z.number().positive("Сумма перевода должна быть больше 0"),
  date: z.string().optional(),
});

export const exportToTransactionSchema = z.object({
  category_id: z.string().uuid("Выберите категорию"),
  title: z
    .string()
    .min(1, "Название не может быть пустым")
    .max(120, "Название слишком длинное")
    .optional(),
});
