/**
 * @module app/mocks/dashboard
 * @fileoverview Мок-данные для тестирования UI Dashboard
 * @description
 * Временные статические данные категорий и транзакций для визуальной отладки
 * компонентов без обращения к реальному API.
 * ---
 * ### Примечания:
 * - Удалить после подключения реального API
 * - Суммы в рублях (₽), всегда положительные — тип определяет знак
 */

export interface MockCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
}

export interface MockTransaction {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  date: string;
}

export const mockCategories: MockCategory[] = [
  { id: "c1", name: "Супермаркеты", type: "expense", icon: "🛒" },
  { id: "c2", name: "Кафе, рестораны и бары", type: "expense", icon: "🍕" },
  { id: "c3", name: "Такси", type: "expense", icon: "🚕" },
  { id: "c4", name: "Аптеки", type: "expense", icon: "💊" },
  { id: "c5", name: "Одежда и обувь", type: "expense", icon: "👕" },
  { id: "c6", name: "Развлечения", type: "expense", icon: "🎮" },
  { id: "c7", name: "Красота и СПА", type: "expense", icon: "💅" },
  { id: "c8", name: "Топливо и АЗС", type: "expense", icon: "⛽" },
  { id: "c9", name: "Зарплата", type: "income", icon: "💰" },
];

export const mockTransactions: MockTransaction[] = [
  {
    id: "t1",
    categoryId: "c9",
    categoryName: "Зарплата",
    categoryIcon: "💰",
    amount: 185000,
    type: "income",
    description: "Аванс за сентябрь",
    date: "2026-09-05",
  },
  {
    id: "t2",
    categoryId: "c1",
    categoryName: "Супермаркеты",
    categoryIcon: "🛒",
    amount: 4820,
    type: "expense",
    description: "Перекрёсток",
    date: "2026-09-05",
  },
  {
    id: "t3",
    categoryId: "c3",
    categoryName: "Такси",
    categoryIcon: "🚕",
    amount: 650,
    type: "expense",
    description: "Яндекс Go — до офиса",
    date: "2026-09-04",
  },
  {
    id: "t4",
    categoryId: "c2",
    categoryName: "Кафе, рестораны и бары",
    categoryIcon: "🍕",
    amount: 2100,
    type: "expense",
    description: "Обед с коллегами",
    date: "2026-09-04",
  },
  {
    id: "t5",
    categoryId: "c4",
    categoryName: "Аптеки",
    categoryIcon: "💊",
    amount: 1350,
    type: "expense",
    description: null,
    date: "2026-09-03",
  },
  {
    id: "t6",
    categoryId: "c8",
    categoryName: "Топливо и АЗС",
    categoryIcon: "⛽",
    amount: 3200,
    type: "expense",
    description: "Лукойл АИ-95",
    date: "2026-09-03",
  },
  {
    id: "t7",
    categoryId: "c5",
    categoryName: "Одежда и обувь",
    categoryIcon: "👕",
    amount: 8900,
    type: "expense",
    description: "Кроссовки Nike",
    date: "2026-09-02",
  },
  {
    id: "t8",
    categoryId: "c1",
    categoryName: "Супермаркеты",
    categoryIcon: "🛒",
    amount: 3150,
    type: "expense",
    description: "Вкусвилл",
    date: "2026-09-02",
  },
  {
    id: "t9",
    categoryId: "c7",
    categoryName: "Красота и СПА",
    categoryIcon: "💅",
    amount: 4500,
    type: "expense",
    description: "Стрижка + укладка",
    date: "2026-09-01",
  },
  {
    id: "t10",
    categoryId: "c6",
    categoryName: "Развлечения",
    categoryIcon: "🎮",
    amount: 1990,
    type: "expense",
    description: "Steam — подписка",
    date: "2026-09-01",
  },
];

/** Общая сумма доходов */
export const mockTotalIncome = mockTransactions
  .filter((t) => t.type === "income")
  .reduce((sum, t) => sum + t.amount, 0);

/** Общая сумма расходов */
export const mockTotalExpense = mockTransactions
  .filter((t) => t.type === "expense")
  .reduce((sum, t) => sum + t.amount, 0);

/** Текущий баланс */
export const mockBalance = mockTotalIncome - mockTotalExpense;

/** Сумма одного зачисления зарплаты (2 раза в месяц) */
export const mockSalaryAmount = 110000;
/** Средние ежедневные траты */
export const mockDailyExpense = 7000;

/**
 * Имитация истории баланса за последние 3 месяца (90 дней)
 * Строим мягкий, "дизайнерский" тренд с плавными волнами без резких скачков.
 */
export const mockBalanceHistory = (() => {
  const history: number[] = [];
  const pointsCount = 30; // 30 плавных точек

  // Допустим, 3 месяца назад баланс был на 30% меньше
  const startVal = mockBalance * 0.9;

  for (let i = 0; i < pointsCount; i++) {
    const progress = i / (pointsCount - 1); // от 0 до 1

    // Линейный тренд
    let val = startVal + (mockBalance - startVal) * progress;

    // Накладываем пару мягких волн для красоты
    val += Math.sin(progress * Math.PI * 2) * (mockBalance * 0.05);
    val += Math.cos(progress * Math.PI * 4) * (mockBalance * 0.02);

    history.push(Math.round(val));
  }

  // Гарантируем, что последняя точка в точности совпадает с текущим балансом
  history[pointsCount - 1] = mockBalance;

  return history;
})();

/**
 * Процентная разница между текущим балансом и балансом месяц назад
 */
export const mockPercentChange = (() => {
  const currentVal = mockBalanceHistory[mockBalanceHistory.length - 1] ?? 0;
  // 30 точек = 3 месяца. 1 месяц назад = 10 точек назад (индекс 19)
  const prevMonthVal = mockBalanceHistory[19] ?? 0;

  if (prevMonthVal === 0) return 0;
  return ((currentVal - prevMonthVal) / Math.abs(prevMonthVal)) * 100;
})();

/** Бюджет на месяц */
export const mockBudget = 60000;

/** Процент использования бюджета */
export const mockBudgetPercent = Math.round(
  (mockTotalExpense / mockBudget) * 100,
);
