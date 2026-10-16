/**
 * @module app/utils/validation
 * @fileoverview Клиентские валидаторы форм без внешних зависимостей
 * @description
 * Обеспечивает единые правила валидации для всех пользовательских форм (транзакции,
 * категории, подписки, бюджет, совместные траты) без использования тяжелых библиотек.
 * ---
 * ### Архитектурные принципы:
 * 1. Базовые примитивы (isValidAmount, isValidText) используются напрямую в однополевых формах.
 * 2. Составные предикаты создаются только для форм с 2+ полями (isTransactionFormValid, etc.).
 * 3. Единая параметризованная функция getNameInputError для проверок длины в реальном времени.
 * 4. Никаких пустых функций-прокси или искусственных оберток (Zero Boilerplate).
 */

import { parseAmount, capitalizeFirstLetter } from "./format";

const MAX_AMOUNT_LIMIT = 10_000_000;
const MAX_NAME_LENGTH = 30;

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==========================================
// 1. Базовые предикаты проверки (чистые функции)
// ==========================================

/**
 * Проверка валидности суммы (число > 0 и <= max)
 */
export function isValidAmount(value: unknown, max = MAX_AMOUNT_LIMIT): boolean {
  if (value === null || value === undefined || value === "") return false;
  const parsed = parseAmount(value as string | number);
  return !isNaN(parsed) && parsed > 0 && parsed <= max;
}

/**
 * Проверка валидности текста после .trim() (длина в диапазоне [min, max])
 */
export function isValidText(
  value: unknown,
  min = 1,
  max = MAX_NAME_LENGTH,
): boolean {
  if (typeof value !== "string") return false;
  const len = value.trim().length;
  return len >= min && len <= max;
}

/**
 * Проверка валидности опционального текста (если передан, длина <= max)
 */
export function isOptionalTextValid(
  value: unknown,
  max = MAX_NAME_LENGTH,
): boolean {
  if (typeof value !== "string") return true;
  return value.trim().length <= max;
}

/**
 * Проверка дня месяца (целое число от 1 до 31)
 */
export function isValidDayOfMonth(value: unknown): boolean {
  const num = Number(value);
  return Number.isInteger(num) && num >= 1 && num <= 31;
}

// ==========================================
// 2. Базовые валидаторы примитивов
// ==========================================

/**
 * Валидация денежной суммы:
 * - число > 0
 * - максимум 10 000 000 ₽
 * - поддержка запятых, точек и пробелов
 */
function validateAmount(
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
 * - проверка минимальной и максимальной длины
 */
function validateText(
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
 * Переиспользуемый валидатор названия сущности (категория, расход, группа, участник)
 */
function validateEntityName(
  value: unknown,
  options: {
    label: string;
    maxLength?: number;
    required?: boolean;
  },
): ValidationResult<string> {
  const maxLength = options.maxLength ?? MAX_NAME_LENGTH;
  const capitalizedLabel = capitalizeFirstLetter(options.label) || options.label;
  return validateText(value, {
    required: options.required ?? true,
    minLength: 1,
    maxLength,
    requiredError: `Введите ${options.label}`,
    maxError: `${capitalizedLabel} не может быть длиннее ${maxLength} символов`,
  });
}

/**
 * Валидация ID категории
 */
function validateCategoryId(value: unknown): ValidationResult<string> {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) {
    return { success: false, error: "Выберите категорию" };
  }
  return { success: true, data: id };
}

/**
 * Валидация даты (YYYY-MM-DD)
 */
function validateDate(value: unknown): ValidationResult<string> {
  const dateStr = typeof value === "string" ? value.trim() : "";
  if (!dateStr) {
    return { success: false, error: "Выберите дату" };
  }
  return { success: true, data: dateStr };
}

/**
 * Валидация дня месяца для регулярных платежей (1..31)
 */
function validateDayOfMonth(value: unknown): ValidationResult<number> {
  if (!isValidDayOfMonth(value)) {
    return { success: false, error: "День должен быть от 1 до 31" };
  }
  return { success: true, data: Number(value) };
}

/**
 * Валидация иконки/эмодзи категории
 */
function validateIcon(value: unknown): ValidationResult<string> {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return { success: false, error: "Выберите эмодзи" };
  }
  return { success: true, data: raw };
}

// ==========================================
// 3. Проверка ошибок ввода в реальном времени (для отображения в UI)
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
 * Проверка названия в реальном времени: возвращает ошибку, если превышен лимит длины.
 * Поддерживает кастомную метку (например: "Имя участника", "Название группы").
 */
export function getNameInputError(
  value: unknown,
  labelOrOptions?:
    | string
    | { label?: string; maxLength?: number; maxError?: string },
  maxLength = MAX_NAME_LENGTH,
): string | null {
  if (typeof value !== "string") return null;
  let label = "Название";
  let max = maxLength;
  let customError: string | undefined;

  if (typeof labelOrOptions === "string") {
    label = labelOrOptions;
  } else if (labelOrOptions && typeof labelOrOptions === "object") {
    if (labelOrOptions.label) label = labelOrOptions.label;
    if (labelOrOptions.maxLength) max = labelOrOptions.maxLength;
    if (labelOrOptions.maxError) customError = labelOrOptions.maxError;
  }

  if (value.trim().length > max) {
    return customError || `${label} не может быть длиннее ${max} символов`;
  }
  return null;
}

/**
 * Проверка дня месяца в реальном времени (1..31)
 */
export function getDayOfMonthInputError(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (!isValidDayOfMonth(value)) {
    return "День должен быть от 1 до 31";
  }
  return null;
}

// ==========================================
// 4. Составные предикаты валидности форм (для computed :disabled)
// Применяются только для форм с 2+ полями. Для форм с 1 полем
// компоненты используют базовые предикаты (isValidText / isValidAmount) напрямую.
// ==========================================

export function isTransactionFormValid(
  amount: unknown,
  name?: unknown,
): boolean {
  return isValidAmount(amount) && isOptionalTextValid(name);
}

export function isCategoryFormValid(name: unknown, icon: unknown): boolean {
  return isValidText(name) && isValidText(icon, 1, 10);
}

export function isSubscriptionFormValid(
  name: unknown,
  amount: unknown,
  dayOfMonth: unknown,
): boolean {
  return (
    isValidText(name) &&
    isValidAmount(amount) &&
    isValidDayOfMonth(dayOfMonth)
  );
}

export function isSplitExpenseFormValid(
  title: unknown,
  amount: unknown,
): boolean {
  return isValidText(title) && isValidAmount(amount);
}

// ==========================================
// 5. Комплексные валидаторы форм (для submit)
// ==========================================

interface TransactionFormData {
  amount: number;
  category_id: string;
  date: string;
  type: "expense" | "income";
  name?: string;
}

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

interface CategoryFormData {
  name: string;
  icon: string;
  type: "expense" | "income";
}

export function validateCategoryForm(input: {
  name: unknown;
  icon: unknown;
  type: "expense" | "income";
}): ValidationResult<CategoryFormData> {
  const nameRes = validateEntityName(input.name, {
    label: "название категории",
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

interface SubscriptionFormData {
  name: string;
  amount: number;
  day_of_month: number;
  category_id: string | null;
}

export function validateSubscriptionForm(input: {
  name: unknown;
  amount: unknown;
  dayOfMonth: unknown;
  categoryId?: unknown;
}): ValidationResult<SubscriptionFormData> {
  const nameRes = validateEntityName(input.name, {
    label: "название платежа",
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

interface BudgetFormData {
  amount: number;
}

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

interface CategoryGoalFormData {
  categoryId?: string;
  amount: number;
}

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

interface SettleDebtFormData {
  from_member_id: string;
  to_member_id: string;
  amount: number;
}

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

  const amountRes = validateAmount(input.amount);
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

interface AddMemberFormData {
  name: string;
  telegramUsername?: string;
}

export function validateAddMemberForm(input: {
  name: unknown;
  telegramUsername?: unknown;
}): ValidationResult<AddMemberFormData> {
  const nameRes = validateEntityName(input.name, {
    label: "имя участника",
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

interface ExportShareFormData {
  title: string;
  category_id: string;
}

export function validateExportShareForm(input: {
  title: unknown;
  categoryId: unknown;
}): ValidationResult<ExportShareFormData> {
  const titleRes = validateEntityName(input.title, {
    label: "название траты",
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

interface GroupFormData {
  name: string;
}

export function validateGroupForm(input: {
  name: unknown;
}): ValidationResult<GroupFormData> {
  const nameRes = validateEntityName(input.name, {
    label: "название группы",
  });
  if (!nameRes.success) return nameRes;

  return {
    success: true,
    data: {
      name: nameRes.data,
    },
  };
}

interface SplitExpenseFormData {
  title: string;
  amount: number;
  payer_id: string;
}

/**
 * Валидация формы добавления/редактирования совместного расхода (AddExpenseModal)
 */
export function validateSplitExpenseForm(input: {
  title: unknown;
  amount: unknown;
  payerId: unknown;
  memberIds: string[];
  hasFixed?: boolean;
  remainingAmount?: number;
  weightedMembersCount?: number;
}): ValidationResult<SplitExpenseFormData> {
  const titleRes = validateEntityName(input.title, {
    label: "название расхода",
  });
  if (!titleRes.success) return titleRes;

  const amountRes = validateAmount(input.amount);
  if (!amountRes.success) return amountRes;

  const payerId =
    typeof input.payerId === "string" ? input.payerId.trim() : "";
  if (!payerId) {
    return { success: false, error: "Выберите, кто оплатил" };
  }

  if (!input.memberIds || input.memberIds.length === 0) {
    return { success: false, error: "Выберите участников расхода" };
  }

  if (input.hasFixed) {
    if (input.remainingAmount !== undefined && input.remainingAmount < -0.01) {
      return { success: false, error: "Сумма долей превышает чек" };
    }
    if (
      input.remainingAmount !== undefined &&
      input.remainingAmount > 0.01 &&
      input.weightedMembersCount === 0
    ) {
      return { success: false, error: "Остаток некому распределить" };
    }
  }

  return {
    success: true,
    data: {
      title: titleRes.data,
      amount: amountRes.data,
      payer_id: payerId,
    },
  };
}
