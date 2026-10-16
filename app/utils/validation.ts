/**
 * @module app/utils/validation
 * @fileoverview Клиентские валидаторы форм без внешних зависимостей
 * @description
 * Обеспечивает единые правила валидации для всех пользовательских форм (транзакции,
 * категории, подписки, бюджет, совместные траты) без использования тяжелых библиотек.
 * Все лимиты и тексты ошибок согласованы в VALIDATION_RULES.md.
 * ---
 * ### Логика работы:
 * 1. Проверка сумм с учетом парсинга и максимального лимита 10 000 000 ₽.
 * 2. Проверка названий и текстов (1–30 символов) с автоматической капитализацией.
 * 3. Формирование читаемых локализованных сообщений об ошибках.
 * 4. Экспорт чистых предикатов для реактивной блокировки кнопок отправки.
 */

import { parseAmount, capitalizeFirstLetter } from "./format";

export const MAX_AMOUNT_LIMIT = 10_000_000;
export const MAX_NAME_LENGTH = 30;

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Валидация денежной суммы по правилам VALIDATION_RULES.md:
 * - число > 0
 * - максимум 10 000 000 ₽
 * - поддержка запятых, точек и пробелов
 */
export function validateAmount(
  value: unknown,
  options: {
    max?: number;
    requiredError?: string;
    invalidError?: string;
    maxError?: string;
  } = {},
): ValidationResult<number> {
  const max = options.max ?? MAX_AMOUNT_LIMIT;
  const requiredError = options.requiredError || "Сумма должна быть больше 0";
  const invalidError = options.invalidError || "Введите корректную сумму";
  const maxError =
    options.maxError || "Сумма не может превышать 10 000 000 ₽";

  if (value === null || value === undefined || value === "") {
    return { success: false, error: requiredError };
  }

  const parsed = parseAmount(value as string | number);

  if (isNaN(parsed)) {
    return { success: false, error: invalidError };
  }

  if (parsed <= 0) {
    return { success: false, error: requiredError };
  }

  if (parsed > max) {
    return { success: false, error: maxError };
  }

  return { success: true, data: parsed };
}

/**
 * Валидация текстового поля (название, комментарий):
 * - обрезка пробелов (.trim())
 * - капитализация первой буквы
 * - проверка минимальной и максимальной длины (по умолчанию до 30 символов)
 */
export function validateText(
  value: unknown,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    requiredError?: string;
    maxError?: string;
  } = {},
): ValidationResult<string> {
  const {
    required = true,
    minLength = 1,
    maxLength = MAX_NAME_LENGTH,
    requiredError = "Введите название",
    maxError = "Название слишком длинное",
  } = options;

  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) {
    if (required) {
      return { success: false, error: requiredError };
    }
    return { success: true, data: "" };
  }

  if (raw.length < minLength) {
    return { success: false, error: requiredError };
  }

  if (raw.length > maxLength) {
    return { success: false, error: maxError };
  }

  const capitalized = capitalizeFirstLetter(raw) || raw;
  return { success: true, data: capitalized };
}

/**
 * Валидация ID категории
 */
export function validateCategoryId(value: unknown): ValidationResult<string> {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) {
    return { success: false, error: "Выберите категорию" };
  }
  return { success: true, data: id };
}

/**
 * Валидация даты (YYYY-MM-DD)
 */
export function validateDate(value: unknown): ValidationResult<string> {
  const dateStr = typeof value === "string" ? value.trim() : "";
  if (!dateStr) {
    return { success: false, error: "Выберите дату" };
  }
  return { success: true, data: dateStr };
}

/**
 * Валидация дня месяца для регулярных платежей (1..31)
 */
export function validateDayOfMonth(value: unknown): ValidationResult<number> {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 31) {
    return { success: false, error: "День должен быть от 1 до 31" };
  }
  return { success: true, data: num };
}

/**
 * Валидация иконки/эмодзи категории
 */
export function validateIcon(value: unknown): ValidationResult<string> {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return { success: false, error: "Выберите эмодзи" };
  }
  return { success: true, data: raw };
}

// ==========================================
// Проверка ошибок ввода в реальном времени (для отображения в UI)
// ==========================================

/**
 * Проверка суммы в реальном времени: возвращает ошибку только если значение
 * введено, но нарушает формат, больше 0 или превышает максимальный лимит.
 */
export function getAmountInputError(
  value: unknown,
  options: { max?: number; maxError?: string } = {},
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = parseAmount(value as string | number);
  if (isNaN(parsed)) {
    return "Введите корректную сумму";
  }
  if (parsed <= 0) {
    return "Сумма должна быть больше 0";
  }
  const max = options.max ?? MAX_AMOUNT_LIMIT;
  if (parsed > max) {
    return options.maxError || "Сумма не может превышать 10 000 000 ₽";
  }
  return null;
}

/**
 * Проверка суммы цели по категории в реальном времени: возвращает ошибку при превышении 10 000 000 ₽.
 */
export function getCategoryGoalInputError(value: unknown): string | null {
  return getAmountInputError(value);
}

/**
 * Проверка названия в реальном времени: возвращает ошибку, если превышен лимит длины.
 */
export function getNameInputError(
  value: unknown,
  options: { maxLength?: number; maxError?: string } = {},
): string | null {
  if (typeof value !== "string") return null;
  const max = options.maxLength ?? MAX_NAME_LENGTH;
  if (value.trim().length > max) {
    return options.maxError || "Название слишком длинное";
  }
  return null;
}

/**
 * Проверка имени участника в реальном времени: возвращает ошибку при превышении 30 символов.
 */
export function getMemberNameInputError(value: unknown): string | null {
  return getNameInputError(value, {
    maxLength: MAX_NAME_LENGTH,
    maxError: "Имя участника не может быть длиннее 30 символов",
  });
}

/**
 * Проверка названия доли совместного расхода в реальном времени: возвращает ошибку при превышении 100 символов.
 */
export function getExportTitleInputError(value: unknown): string | null {
  return getNameInputError(value, {
    maxLength: 100,
    maxError: "Название траты не может превышать 100 символов",
  });
}

/**
 * Проверка названия группы совместных трат в реальном времени: возвращает ошибку при превышении 30 символов.
 */
export function getGroupNameInputError(value: unknown): string | null {
  return getNameInputError(value, {
    maxLength: MAX_NAME_LENGTH,
    maxError: "Название группы не может быть длиннее 30 символов",
  });
}

/**
 * Проверка дня месяца в реальном времени: возвращает ошибку, если значение вне 1..31.
 */
export function getDayOfMonthInputError(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 31) {
    return "День должен быть от 1 до 31";
  }
  return null;
}

// ==========================================
// Предикаты валидности (для computed :disabled)
// ==========================================

/**
 * Проверка валидности полей ввода (input) формы транзакции для блокировки кнопки.
 * Блокирует кнопку только если не заполнена сумма или нарушен лимит длины названия.
 * Если категория не выбрана, кнопка активна, но при нажатии покажет «Выберите категорию».
 */
export function isTransactionFormValid(
  amount: unknown,
  name?: unknown,
): boolean {
  const parsed = parseAmount(amount as string | number);
  if (isNaN(parsed) || parsed <= 0 || parsed > MAX_AMOUNT_LIMIT) {
    return false;
  }
  if (typeof name === "string" && name.trim().length > MAX_NAME_LENGTH) {
    return false;
  }
  return true;
}

/**
 * Проверка валидности формы категории для блокировки кнопки
 */
export function isCategoryFormValid(name: unknown, icon: unknown): boolean {
  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedIcon = typeof icon === "string" ? icon.trim() : "";
  return (
    trimmedName.length >= 1 &&
    trimmedName.length <= MAX_NAME_LENGTH &&
    trimmedIcon.length >= 1
  );
}

/**
 * Проверка валидности формы регулярного платежа для блокировки кнопки
 */
export function isSubscriptionFormValid(
  name: unknown,
  amount: unknown,
  dayOfMonth: unknown,
): boolean {
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (trimmedName.length < 1 || trimmedName.length > MAX_NAME_LENGTH) {
    return false;
  }
  const parsed = parseAmount(amount as string | number);
  if (isNaN(parsed) || parsed <= 0 || parsed > MAX_AMOUNT_LIMIT) {
    return false;
  }
  const day = Number(dayOfMonth);
  if (!Number.isInteger(day) || day < 1 || day <= 0 || day > 31) {
    return false;
  }
  return true;
}

/**
 * Проверка валидности формы общего бюджета для блокировки кнопки
 */
export function isBudgetFormValid(amount: unknown): boolean {
  const parsed = parseAmount(amount as string | number);
  return !isNaN(parsed) && parsed > 0 && parsed <= MAX_AMOUNT_LIMIT;
}

/**
 * Проверка валидности формы цели категории для блокировки кнопки
 */
export function isCategoryGoalFormValid(amount: unknown): boolean {
  return isBudgetFormValid(amount);
}

/**
 * Проверка валидности формы возврата долга для блокировки кнопки (только по сумме)
 */
export function isSettleDebtFormValid(amount: unknown): boolean {
  return isBudgetFormValid(amount);
}

/**
 * Проверка валидности формы добавления участника для блокировки кнопки
 */
export function isAddMemberFormValid(name: unknown): boolean {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed.length >= 1 && trimmed.length <= MAX_NAME_LENGTH;
}

/**
 * Проверка валидности формы экспорта доли в личные траты для блокировки кнопки
 */
export function isExportShareFormValid(title: unknown): boolean {
  const trimmed = typeof title === "string" ? title.trim() : "";
  return trimmed.length >= 1 && trimmed.length <= 100;
}

/**
 * Проверка валидности формы создания группы совместных трат для блокировки кнопки
 */
export function isGroupFormValid(name: unknown): boolean {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed.length >= 1 && trimmed.length <= MAX_NAME_LENGTH;
}

// ==========================================
// Комплексные валидаторы форм (для submit)
// ==========================================

export interface TransactionFormData {
  amount: number;
  category_id: string;
  date: string;
  type: "expense" | "income";
  name?: string;
}

/**
 * Валидация формы транзакции (TransactionModal, ScanEditModal)
 */
export function validateTransactionForm(input: {
  amount: unknown;
  categoryId: unknown;
  date: unknown;
  type: "expense" | "income";
  name?: unknown;
}): ValidationResult<TransactionFormData> {
  const amountRes = validateAmount(input.amount);
  if (!amountRes.success) return amountRes;

  const catRes = validateCategoryId(input.categoryId);
  if (!catRes.success) return catRes;

  const dateRes = validateDate(input.date);
  if (!dateRes.success) return dateRes;

  const nameRes = validateText(input.name, {
    required: false,
    maxLength: MAX_NAME_LENGTH,
  });
  if (!nameRes.success) return nameRes;

  return {
    success: true,
    data: {
      amount: amountRes.data,
      category_id: catRes.data,
      date: dateRes.data,
      type: input.type,
      name: nameRes.data || undefined,
    },
  };
}

export interface CategoryFormData {
  name: string;
  icon: string;
  type: "expense" | "income";
}

/**
 * Валидация формы создания/обновления категории
 */
export function validateCategoryForm(input: {
  name: unknown;
  icon: unknown;
  type: "expense" | "income";
}): ValidationResult<CategoryFormData> {
  const nameRes = validateText(input.name, {
    required: true,
    minLength: 1,
    maxLength: MAX_NAME_LENGTH,
    requiredError: "Введите название категории",
  });
  if (!nameRes.success) return nameRes;

  const iconRes = validateIcon(input.icon);
  if (!iconRes.success) return iconRes;

  return {
    success: true,
    data: {
      name: nameRes.data,
      icon: iconRes.data,
      type: input.type,
    },
  };
}

export interface SubscriptionFormData {
  name: string;
  amount: number;
  day_of_month: number;
  category_id: string | null;
}

/**
 * Валидация формы регулярного платежа / подписки
 */
export function validateSubscriptionForm(input: {
  name: unknown;
  amount: unknown;
  dayOfMonth: unknown;
  categoryId?: unknown;
}): ValidationResult<SubscriptionFormData> {
  const nameRes = validateText(input.name, {
    required: true,
    minLength: 1,
    maxLength: MAX_NAME_LENGTH,
    requiredError: "Введите название платежа",
  });
  if (!nameRes.success) return nameRes;

  const amountRes = validateAmount(input.amount);
  if (!amountRes.success) return amountRes;

  const dayRes = validateDayOfMonth(input.dayOfMonth);
  if (!dayRes.success) return dayRes;

  const categoryId =
    input.categoryId && typeof input.categoryId === "string"
      ? input.categoryId.trim() || null
      : null;

  return {
    success: true,
    data: {
      name: nameRes.data,
      amount: amountRes.data,
      day_of_month: dayRes.data,
      category_id: categoryId,
    },
  };
}

export interface BudgetFormData {
  amount: number;
}

/**
 * Валидация формы общего бюджета
 */
export function validateBudgetForm(input: {
  amount: unknown;
}): ValidationResult<BudgetFormData> {
  const amountRes = validateAmount(input.amount, {
    requiredError: "Бюджет должен быть больше 0",
  });
  if (!amountRes.success) return amountRes;

  return {
    success: true,
    data: {
      amount: amountRes.data,
    },
  };
}

export interface CategoryGoalFormData {
  categoryId?: string;
  amount: number;
}

/**
 * Валидация формы цели по категории (CategoryGoalModal, CategoryGoalCard)
 */
export function validateCategoryGoalForm(input: {
  amount: unknown;
  categoryId?: unknown;
  requireCategory?: boolean;
}): ValidationResult<CategoryGoalFormData> {
  if (input.requireCategory) {
    const catRes = validateCategoryId(input.categoryId);
    if (!catRes.success) {
      return { success: false, error: "Выберите категорию расходов" };
    }
  }

  const amountRes = validateAmount(input.amount, {
    max: MAX_AMOUNT_LIMIT,
    requiredError: "Укажите сумму лимита",
    maxError: "Сумма не может превышать 10 000 000 ₽",
  });
  if (!amountRes.success) return amountRes;

  const categoryId =
    typeof input.categoryId === "string" ? input.categoryId.trim() : undefined;

  return {
    success: true,
    data: {
      amount: Math.round(amountRes.data),
      categoryId,
    },
  };
}

export interface SettleDebtFormData {
  from_member_id: string;
  to_member_id: string;
  amount: number;
}

/**
 * Валидация формы фиксации возврата долга (SettleDebtModal)
 */
export function validateSettleDebtForm(input: {
  fromMemberId: unknown;
  toMemberId: unknown;
  amount: unknown;
}): ValidationResult<SettleDebtFormData> {
  const fromId =
    typeof input.fromMemberId === "string" ? input.fromMemberId.trim() : "";
  if (!fromId) {
    return { success: false, error: "Выберите, кто перевел долг" };
  }

  const toId =
    typeof input.toMemberId === "string" ? input.toMemberId.trim() : "";
  if (!toId) {
    return { success: false, error: "Выберите получателя перевода" };
  }

  if (fromId === toId) {
    return {
      success: false,
      error: "Отправитель и получатель не могут совпадать",
    };
  }

  const amountRes = validateAmount(input.amount, {
    max: MAX_AMOUNT_LIMIT,
    maxError: "Сумма не может превышать 10 000 000 ₽",
  });
  if (!amountRes.success) return amountRes;

  return {
    success: true,
    data: {
      from_member_id: fromId,
      to_member_id: toId,
      amount: amountRes.data,
    },
  };
}

export interface AddMemberFormData {
  name: string;
  telegramUsername?: string;
}

/**
 * Валидация формы добавления участника (AddMemberModal)
 */
export function validateAddMemberForm(input: {
  name: unknown;
  telegramUsername?: unknown;
}): ValidationResult<AddMemberFormData> {
  const nameRes = validateText(input.name, {
    required: true,
    minLength: 1,
    maxLength: MAX_NAME_LENGTH,
    requiredError: "Введите имя участника",
    maxError: "Имя участника не может быть длиннее 30 символов",
  });
  if (!nameRes.success) return nameRes;

  const rawTg =
    typeof input.telegramUsername === "string"
      ? input.telegramUsername.trim()
      : "";

  return {
    success: true,
    data: {
      name: nameRes.data,
      telegramUsername: rawTg || undefined,
    },
  };
}

export interface ExportShareFormData {
  title: string;
  category_id: string;
}

/**
 * Валидация формы внесения доли совместного расхода в личные траты (ExportShareModal)
 */
export function validateExportShareForm(input: {
  title: unknown;
  categoryId: unknown;
}): ValidationResult<ExportShareFormData> {
  const titleRes = validateText(input.title, {
    required: true,
    minLength: 1,
    maxLength: 100,
    requiredError: "Введите название траты",
    maxError: "Название траты не может превышать 100 символов",
  });
  if (!titleRes.success) return titleRes;

  const categoryRes = validateCategoryId(input.categoryId);
  if (!categoryRes.success) return categoryRes;

  return {
    success: true,
    data: {
      title: titleRes.data,
      category_id: categoryRes.data,
    },
  };
}

export interface GroupFormData {
  name: string;
}

/**
 * Валидация формы создания группы совместных трат (AddGroupModal)
 */
export function validateGroupForm(input: {
  name: unknown;
}): ValidationResult<GroupFormData> {
  const nameRes = validateText(input.name, {
    required: true,
    minLength: 1,
    maxLength: MAX_NAME_LENGTH,
    requiredError: "Введите название группы",
    maxError: "Название группы не может быть длиннее 30 символов",
  });
  if (!nameRes.success) return nameRes;

  return {
    success: true,
    data: {
      name: nameRes.data,
    },
  };
}
