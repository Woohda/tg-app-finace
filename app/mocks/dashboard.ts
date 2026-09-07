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

/** Бюджет на месяц */
export const mockBudget = 60000;

/** Процент использования бюджета */
export const mockBudgetPercent = Math.round(
  (mockTotalExpense / mockBudget) * 100,
);
