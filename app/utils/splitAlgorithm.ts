/**
 * @module app/utils/splitAlgorithm
 * @fileoverview Единая точка доступа к алгоритмам совместных трат (Splitwise)
 * @description
 * Реэкспортирует модули предметной области совместных трат:
 * - `split/shares`: расчет и валидация долей чеков (`calculateEqualShares`, `calculateSharesByWeights`, `calculateHybridShares`, `calculateExpenseSharesDistribution`, `roundCurrency`).
 * - `split/debts`: расчет балансов участников и оптимизация долгов (`calculateMemberBalances`, `simplifyDebts`).
 * - `split/report`: генерация текстового отчета для Telegram (`formatTelegramSplitReport`).
 */

export * from "./split/shares";
export * from "./split/debts";
export * from "./split/report";
