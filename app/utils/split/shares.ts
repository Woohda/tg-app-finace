/**
 * @module app/utils/split/shares
 * @fileoverview Алгоритмы расчета и распределения долей чека совместных трат
 * @description
 * Предоставляет чистые функции для вычисления долей расходов между участниками:
 * - Округление валюты с защитой от погрешностей IEEE 754.
 * - Равномерное деление чека (`calculateEqualShares`).
 * - Пропорциональное весовое деление (`calculateSharesByWeights`).
 * - Гибридный сплит с фиксацией точных сумм и распределением остатка (`calculateHybridShares`).
 * - Валидация и сквозное распределение долей (`calculateExpenseSharesDistribution`).
 */
import type { SplitExpenseShareInput } from "~/types/split";

/**
 * @function roundCurrency
 * @fileoverview Округление денежной суммы до 2 знаков после запятой
 * @description
 * Выполняет математическое округление с добавлением Number.EPSILON для устранения погрешностей IEEE 754.
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * @function calculateEqualShares
 * @fileoverview Равномерное деление суммы расходов между участниками
 * @description
 * Делит общую сумму чека на равные части и распределяет остаток неделимых копеек
 * по одной копейке первым участникам списка, гарантируя точную сходимость суммы.
 */
export function calculateEqualShares(
  totalAmount: number,
  memberIds: string[],
): Record<string, number> {
  const result: Record<string, number> = {};
  const count = memberIds.length;

  if (count === 0 || totalAmount <= 0) {
    return result;
  }

  const roundedTotal = roundCurrency(totalAmount);
  const totalCents = Math.round(roundedTotal * 100);
  const baseCents = Math.floor(totalCents / count);
  let remainderCents = totalCents % count;

  for (const id of memberIds) {
    const extraCent = remainderCents > 0 ? 1 : 0;
    result[id] = (baseCents + extraCent) / 100;
    if (remainderCents > 0) {
      remainderCents -= 1;
    }
  }

  return result;
}

/**
 * @function calculateSharesByWeights
 * @fileoverview Пропорциональное распределение суммы по коэффициентам долей
 * @description
 * Рассчитывает сумму затрат каждого участника пропорционально заданным весам (shares),
 * устраняя погрешности округления добавлением оставшихся копеек долям с максимальным весом.
 */
export function calculateSharesByWeights(
  totalAmount: number,
  shares: { memberId: string; weight: number }[],
): Record<string, number> {
  const result: Record<string, number> = {};
  const totalWeight = shares.reduce((acc, s) => acc + s.weight, 0);

  if (shares.length === 0 || totalAmount <= 0 || totalWeight <= 0) {
    return result;
  }

  const roundedTotal = roundCurrency(totalAmount);
  let distributedCents = 0;

  shares.forEach((s) => {
    const rawAmount = (roundedTotal * s.weight) / totalWeight;
    const cents = Math.floor(rawAmount * 100);
    result[s.memberId] = cents / 100;
    distributedCents += cents;
  });

  // Распределяем оставшиеся центы/копейки участникам с максимальными долями
  let diffCents = Math.round(roundedTotal * 100) - distributedCents;
  const sortedByWeight = [...shares].sort((a, b) => b.weight - a.weight);

  for (const s of sortedByWeight) {
    if (diffCents <= 0) break;
    const current = result[s.memberId] ?? 0;
    result[s.memberId] = roundCurrency(current + 0.01);
    diffCents -= 1;
  }

  return result;
}

export interface HybridShareInput {
  memberId: string;
  isFixed?: boolean;
  fixedAmount?: number;
  weight?: number;
}

/**
 * @function calculateHybridShares
 * @fileoverview Гибридное деление суммы: фиксированные суммы (рубли) + распределение остатка по долям
 * @description
 * 1. Выделяет участников с фиксированной суммой (isFixed: true) и резервирует их суммы.
 * 2. Вычисляет остаток чека (totalAmount - sumFixed).
 * 3. Если остаток > 0, распределяет его между оставшимися участниками пропорционально их коэффициентам (весам).
 * 4. Если фиксированных участников нет, работает как классический calculateSharesByWeights.
 */
export function calculateHybridShares(
  totalAmount: number,
  items: HybridShareInput[],
): Record<string, number> {
  const result: Record<string, number> = {};
  if (items.length === 0 || totalAmount <= 0) {
    return result;
  }

  const roundedTotal = roundCurrency(totalAmount);

  const fixedItems = items.filter(
    (i) => i.isFixed && typeof i.fixedAmount === "number" && i.fixedAmount >= 0,
  );
  const weightedItems = items.filter(
    (i) => !i.isFixed || typeof i.fixedAmount !== "number" || i.fixedAmount < 0,
  );

  let sumFixed = 0;
  for (const fi of fixedItems) {
    const amt = roundCurrency(fi.fixedAmount || 0);
    result[fi.memberId] = amt;
    sumFixed = roundCurrency(sumFixed + amt);
  }

  const remainder = roundCurrency(roundedTotal - sumFixed);

  if (weightedItems.length > 0) {
    if (remainder > 0) {
      const weightedMap = calculateSharesByWeights(
        remainder,
        weightedItems.map((wi) => ({
          memberId: wi.memberId,
          weight: wi.weight && wi.weight > 0 ? wi.weight : 1,
        })),
      );
      for (const wi of weightedItems) {
        result[wi.memberId] = weightedMap[wi.memberId] ?? 0;
      }
    } else {
      // Если остатка нет или фиксированные суммы превысили чек
      for (const wi of weightedItems) {
        result[wi.memberId] = 0;
      }
    }
  }

  return result;
}

export interface CalculatedExpenseShare {
  member_id: string;
  amount: number;
  share_value: number | null;
}

/**
 * @function calculateExpenseSharesDistribution
 * @fileoverview Распределение и валидация долей расхода по выбранному типу сплита
 * @description
 * Производит расчет сумм долей участников в зависимости от типа деления:
 * - equal: равное деление с распределением остатка копеек через calculateEqualShares.
 * - shares: гибридный расчет (фиксированные суммы + весовые доли) через calculateHybridShares.
 * - exact: фиксация точных сумм с проверкой сходимости с общей суммой расхода (погрешность <= 0.01 ₽).
 */
export function calculateExpenseSharesDistribution(
  amount: number,
  splitType: "equal" | "exact" | "shares",
  shares: SplitExpenseShareInput[],
): CalculatedExpenseShare[] {
  const calculatedShares: CalculatedExpenseShare[] = [];
  const roundedTotalAmount = roundCurrency(amount);

  if (splitType === "equal") {
    const memberIds = shares.map((s) => s.member_id);
    const sharesMap = calculateEqualShares(roundedTotalAmount, memberIds);
    for (const memberId of memberIds) {
      calculatedShares.push({
        member_id: memberId,
        amount: sharesMap[memberId] || 0,
        share_value: null,
      });
    }
  } else if (splitType === "shares") {
    const hybridItems = shares.map((s) => ({
      memberId: s.member_id,
      isFixed: Boolean(
        s.is_fixed ||
          (s.amount !== undefined && s.amount !== null && s.share_value === null),
      ),
      fixedAmount: s.amount ?? undefined,
      weight: s.share_value && s.share_value > 0 ? s.share_value : 1,
    }));
    const sharesMap = calculateHybridShares(roundedTotalAmount, hybridItems);
    for (const item of hybridItems) {
      calculatedShares.push({
        member_id: item.memberId,
        amount: sharesMap[item.memberId] || 0,
        share_value: item.isFixed ? null : (item.weight || 1),
      });
    }
  } else {
    // splitType === 'exact'
    let totalSharesAmount = 0;
    for (const s of shares) {
      const shareAmount = roundCurrency(s.amount || 0);
      totalSharesAmount = roundCurrency(totalSharesAmount + shareAmount);
      calculatedShares.push({
        member_id: s.member_id,
        amount: shareAmount,
        share_value: null,
      });
    }

    if (Math.abs(totalSharesAmount - roundedTotalAmount) > 0.01) {
      throw createError({
        statusCode: 400,
        statusMessage: `Сумма долей (${totalSharesAmount} ₽) не совпадает с общей суммой расхода (${roundedTotalAmount} ₽)`,
      });
    }
  }

  return calculatedShares;
}
