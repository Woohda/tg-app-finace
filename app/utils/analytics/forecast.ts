/**
 * @module app/utils/analytics/forecast
 * @fileoverview Прогнозирование расходов категорий, сопоставление подписок и фильтрация выбросов
 * @description
 * Математическое ядро прогнозирования трат до конца месяца:
 * - сопоставляет активные регулярные подписки с фактическими операциями;
 * - выявляет разовые статистические выбросы (аномальные крупные чеки) и исключает их из будущего темпа;
 * - рассчитывает честный прогноз для разовых дискретных платежей (ЖКХ, аренда) и регулярных переменных трат.
 * ---
 * ### Логика работы:
 * 1. Сопоставляет регулярные подписки по категории, сумме и совпадению названий.
 * 2. Выделяет статистические выбросы (> 3 медианных чеков), учитывая их в факте, но не экстраполируя в будущее.
 * 3. Для разовых платежей (<= 3 операций в прошлом месяце) берет сумму прошлого месяца до оплаты и фиксирует факт после оплаты.
 * 4. Для переменных трат экстраполирует среднедневной регулярный темп на оставшиеся дни месяца.
 * 5. Рассчитывает темп расходования лимита категории (Goal Pacing): день исчерпания и безопасный суточный остаток.
 */
import type { Transaction } from "~/composables/useTransactions";
import type { Subscription } from "~/composables/useSubscriptions";
import {
  getDaysPassedInMonth,
  getDaysInMonthCount,
  getNow,
  toSafeDate,
} from "~/utils/date";
import { formatAmount } from "~/utils/format";
import { calculateMedian } from "./math";

/**
 * Параметры для расчета прогноза расходов по категории до конца месяца.
 */
export interface CategoryForecastParams {
  currentExpenses: Transaction[];
  prevExpenses?: Transaction[];
  subscriptions?: Subscription[];
  categoryId?: string | null;
  daysPassed: number;
  daysInMonth: number;
}

/**
 * Результат сопоставления подписок с фактическими расходами.
 */
export interface SubscriptionMatchResult {
  recordedIds: Set<string>;
  upcomingSubscriptions: Subscription[];
  upcomingTotal: number;
  pastTotal: number;
}

/**
 * Результат разделения массива расходов на регулярные траты и выбросы.
 */
export interface OutlierPartitionResult {
  regular: Transaction[];
  outliers: Transaction[];
  regularTotal: number;
  outliersTotal: number;
}

/**
 * Сопоставляет регулярные подписки с массивом фактических расходов:
 * - находит уже оплаченные подписки (по совпадению суммы, категории или названия);
 * - рассчитывает сумму уже списанных и предстоящих платежей.
 */
export function matchSubscriptionsWithExpenses(
  expenses: Transaction[],
  subscriptions: Subscription[],
  categoryId?: string | null,
): SubscriptionMatchResult {
  const recordedIds = new Set<string>();
  const availableExpenses = [...expenses];

  const relevantSubs = subscriptions.filter(
    (sub) => sub.is_active && (!categoryId || sub.category_id === categoryId),
  );

  for (const sub of relevantSubs) {
    const txIndex = availableExpenses.findIndex((tx) => {
      const isSameAmount = Math.abs(tx.amount - sub.amount) < 0.01;
      if (!isSameAmount) return false;

      const isSameCategory =
        !sub.category_id || tx.categoryId === sub.category_id;
      const isSameName =
        Boolean(tx.name) &&
        Boolean(sub.name) &&
        (tx.name!.toLowerCase().includes(sub.name.toLowerCase()) ||
          sub.name.toLowerCase().includes(tx.name!.toLowerCase()));

      return isSameCategory || isSameName;
    });

    if (txIndex !== -1) {
      recordedIds.add(sub.id);
      availableExpenses.splice(txIndex, 1);
    }
  }

  const upcomingSubscriptions = relevantSubs.filter(
    (sub) => !recordedIds.has(sub.id),
  );
  const upcomingTotal = upcomingSubscriptions.reduce(
    (sum, s) => sum + s.amount,
    0,
  );

  const pastTotal = relevantSubs
    .filter((sub) => recordedIds.has(sub.id))
    .reduce((sum, s) => sum + s.amount, 0);

  return {
    recordedIds,
    upcomingSubscriptions,
    upcomingTotal,
    pastTotal,
  };
}

/**
 * Разделяет массив транзакций на регулярные траты и статистические выбросы (аномальные разовые чеки).
 * Выбросом считается трата, которая:
 * 1. Превышает медианный чек категории более чем в 3 раза.
 * 2. Превышает медиану минимум на 1 500 ₽ (защита от ложных срабатываний на микро-платежах).
 */
export function partitionOutliers(
  transactions: Transaction[],
  referenceTransactions: Transaction[] = [],
): OutlierPartitionResult {
  if (transactions.length === 0) {
    return { regular: [], outliers: [], regularTotal: 0, outliersTotal: 0 };
  }

  // Для определения типичного чека используем прошлый месяц (если в нем >= 3 операций),
  // либо текущие транзакции
  const baseTransactions =
    referenceTransactions.length >= 3 ? referenceTransactions : transactions;
  const medianAmount = calculateMedian(baseTransactions.map((t) => t.amount));

  const regular: Transaction[] = [];
  const outliers: Transaction[] = [];
  let regularTotal = 0;
  let outliersTotal = 0;

  for (const t of transactions) {
    const isOutlier =
      medianAmount > 0 &&
      t.amount >= 3 * medianAmount &&
      t.amount - medianAmount >= 1500;

    if (isOutlier) {
      outliers.push(t);
      outliersTotal += t.amount;
    } else {
      regular.push(t);
      regularTotal += t.amount;
    }
  }

  return { regular, outliers, regularTotal, outliersTotal };
}

/**
 * Рассчитывает прогнозируемую сумму трат по категории на конец месяца с учетом характера трат:
 * 1. При наличии настроенной активной подписки: предстоящие списания прибавляются, а списанные исключаются из темпа.
 * 2. Для категорий разовых ежемесячных платежей (в прошлом месяце <= 3 транзакций):
 *    - если в текущем месяце трат еще не было (0 ₽), прогноз принимается равным сумме прошлого месяца;
 *    - если трата уже произошла, она считается разовой и не умножается на оставшиеся дни месяца.
 * 3. Для категорий регулярных переменных трат (> 3 транзакций):
 *    - аномальные всплески (банкеты, крупные разовые покупки) отделяются и не размножаются на будущие дни;
 *    - фоновый регулярный темп экстраполируется на оставшиеся дни месяца.
 */
export function calculateCategoryForecast(
  params: CategoryForecastParams,
): number | null {
  const {
    currentExpenses,
    prevExpenses = [],
    subscriptions = [],
    categoryId,
    daysPassed,
    daysInMonth,
  } = params;

  const currentTotal = currentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const prevTotal = prevExpenses.reduce((sum, t) => sum + t.amount, 0);

  // 1. Проверяем наличие активных подписок для этой категории
  const categorySubs = subscriptions.filter(
    (sub) => sub.is_active && (!categoryId || sub.category_id === categoryId),
  );

  if (categorySubs.length > 0) {
    const match = matchSubscriptionsWithExpenses(
      currentExpenses,
      categorySubs,
      categoryId,
    );

    const remainingDays = Math.max(0, daysInMonth - daysPassed);
    const variableExpenses = currentExpenses.filter(
      (t) => !match.recordedIds.has(t.id),
    );
    const { regularTotal: regularVariableSpent } = partitionOutliers(
      variableExpenses,
      prevExpenses,
    );
    const avgDailyVariable =
      daysPassed > 0 ? regularVariableSpent / daysPassed : 0;
    const expectedVariableFuture = Math.round(
      avgDailyVariable * remainingDays,
    );

    return currentTotal + expectedVariableFuture + match.upcomingTotal;
  }

  // 2. Частный случай: Разовый ежемесячный платеж (коммуналка, аренда, налоги и т.д.)
  // Если в прошлом месяце было от 1 до 3 транзакций (характер дискретного разового платежа)
  const isOneOffMonthlyCategory =
    prevExpenses.length > 0 && prevExpenses.length <= 3;

  if (isOneOffMonthlyCategory) {
    // А. Платеж в текущем месяце еще не произошел (0 ₽) — ожидаем повторения суммы прошлого месяца
    if (currentTotal === 0 && prevTotal > 0) {
      return prevTotal;
    }
    // Б. Платеж уже оплачен (например, 2-го числа) — фиксируем его, не раздувая на оставшиеся дни
    if (currentTotal > 0) {
      return currentTotal;
    }
  }

  // 3. Стандартная категория с регулярными переменными тратами (продукты, кафе, такси и т.д.)
  if (currentTotal === 0 && prevTotal === 0) {
    return null;
  }

  if (daysPassed === 0) {
    return currentTotal > 0 ? currentTotal : null;
  }

  const remainingDays = Math.max(0, daysInMonth - daysPassed);
  const { regularTotal } = partitionOutliers(currentExpenses, prevExpenses);
  const avgDaily = regularTotal / daysPassed;
  const expectedFuture = Math.round(avgDaily * remainingDays);

  return currentTotal + expectedFuture;
}

export interface CategoryGoalPacingParams {
  /** Сумма установленного лимита (цели) на месяц в рублях */
  goal: number;
  /** Фактически потраченная сумма в категории за текущий месяц */
  monthSpent: number;
  /** Прогнозируемая сумма трат категории на конец месяца (или null, если нет прогноза) */
  forecast?: number | null;
  /** Медианный чек категории в рублях (если есть исторические операции) */
  medianCheck?: number | null;
  /** Количество прошедших дней в месяце (1..31). По умолчанию getDaysPassedInMonth() */
  daysPassed?: number;
  /** Общее количество дней в месяце (28..31). По умолчанию getDaysInMonthCount() */
  daysInMonth?: number;
  /** Базовая дата месяца для построения даты исчерпания. По умолчанию getNow() */
  referenceDate?: Date;
}

export interface CategoryGoalPacingResult {
  /** Безопасный суточный остаток трат (₽/день), чтобы уложиться в лимит */
  safeDailyAllowance: number;
  /** Количество оставшихся покупок по медианному чеку (если медиана доступна) */
  remainingChecksByMedian: number | null;
  /** Текстовая формулировка темпа (например, "не более 8 покупок (медиана 500,00 ₽)") */
  paceText: string;
  /** Предполагаемая дата исчерпания лимита при текущем темпе трат (если прогнозируется превышение) */
  exhaustionDate: Date | null;
  /** День месяца исчерпания лимита (число 1..31) */
  exhaustionDay: number | null;
  /** Флаг риска перерасхода (прогноз превышает лимит) */
  isOverspendProjected: boolean;
  /** Флаг, что лимит уже фактически превышен прямо сейчас */
  isAlreadyOverspent: boolean;
  /** Оставшиеся дни до конца месяца */
  remainingDays: number;
}

/**
 * Склоняет слово «покупка» для натуральных чисел в русском языке.
 */
function pluralizePurchases(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} покупок`;
  if (mod10 === 1) return `${count} покупка`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} покупки`;
  return `${count} покупок`;
}

/**
 * Рассчитывает темп расходования лимита категории (Category Goal Pacing):
 * 1. Безопасный суточный остаток трат: сколько можно тратить в день до конца месяца, чтобы уложиться в лимит.
 * 2. Оценка в количестве покупок по медианному чеку (дискретный лимит трат).
 * 3. День исчерпания лимита: при текущем прогнозном темпе расходов определяет календарную дату,
 *    когда остаток лимита будет полностью израсходован.
 */
export function calculateCategoryGoalPacing(
  params: CategoryGoalPacingParams,
): CategoryGoalPacingResult | null {
  const {
    goal,
    monthSpent,
    forecast,
    medianCheck,
    daysPassed = getDaysPassedInMonth(),
    daysInMonth = getDaysInMonthCount(),
    referenceDate = getNow(),
  } = params;

  if (goal <= 0) return null;

  const passed = Math.max(1, daysPassed);
  const totalDays = Math.max(1, daysInMonth);
  const remainingDays = Math.max(0, totalDays - passed);

  const isAlreadyOverspent = monthSpent >= goal;
  const isOverspendProjected =
    forecast !== null &&
    forecast !== undefined &&
    forecast > goal &&
    !isAlreadyOverspent;

  const remainingLimit = Math.max(0, goal - monthSpent);

  // Безопасный суточный остаток (₽/день)
  let safeDailyAllowance = 0;
  if (!isAlreadyOverspent) {
    safeDailyAllowance =
      remainingDays > 0
        ? Math.max(0, Math.floor(remainingLimit / remainingDays))
        : Math.max(0, remainingLimit);
  }

  // Оценка в количестве покупок по медианному чеку
  let remainingChecksByMedian: number | null = null;
  let paceText: string;

  if (isAlreadyOverspent) {
    paceText = "0 покупок";
  } else if (
    medianCheck !== undefined &&
    medianCheck !== null &&
    medianCheck > 0
  ) {
    const checks = Math.floor(remainingLimit / medianCheck);
    remainingChecksByMedian = checks;

    if (checks >= 1) {
      paceText = `не более ${pluralizePurchases(checks)} (медианный чек ${formatAmount(medianCheck)})`;
    } else if (remainingLimit > 0) {
      paceText = `менее 1 покупки (остаток ${formatAmount(remainingLimit)})`;
    } else {
      paceText = "0 покупок";
    }
  } else {
    paceText = `не более ${formatAmount(safeDailyAllowance)}/день`;
  }

  // Расчет дня исчерпания лимита
  let exhaustionDate: Date | null = null;
  let exhaustionDay: number | null = null;

  if (isOverspendProjected && remainingDays > 0) {
    const expectedRemaining = Math.max(1, forecast! - monthSpent);
    const progressFraction = Math.min(
      1,
      Math.max(0, remainingLimit / expectedRemaining),
    );

    const daysUntilExhaustion = Math.max(
      1,
      Math.round(remainingDays * progressFraction),
    );
    exhaustionDay = Math.min(totalDays, passed + daysUntilExhaustion);

    const base = toSafeDate(referenceDate);
    exhaustionDate = new Date(
      base.getFullYear(),
      base.getMonth(),
      exhaustionDay,
    );
  }

  return {
    safeDailyAllowance,
    remainingChecksByMedian,
    paceText,
    exhaustionDate,
    exhaustionDay,
    isOverspendProjected,
    isAlreadyOverspent,
    remainingDays,
  };
}
