/**
 * @module app/utils/zIndex
 * @fileoverview Централизованный реестр уровней z-index для приложения
 * @description
 * Предоставляет единый источник истины для распределения слоев отображения (z-index)
 * между навигацией, модальными окнами, шторками выбора и системными оверлеями.
 * Устраняет проблему коллизий слоев при открытии вложенных модальных окон.
 * ---
 * ### Иерархия слоев:
 * - `BOTTOM_NAV` (50): Нижняя панель навигации (BottomNav).
 * - `MODAL_BASE` (60): Базовые модальные окна первого уровня (аналитика, создание категорий, подписки).
 * - `TRANSACTION` (70): Модальное окно операций (открывается поверх базовых модалок).
 * - `CATEGORY_SHEET_BACKDROP` (80) / `CATEGORY_SHEET` (85): Шторка выбора категории внутри формы операции.
 * - `MODAL_CONFIRM` (90): Диалоги подтверждения (удаление категорий/подписок) и правка чека (ScanEdit).
 * - `LOADER` (100): Глобальный индикатор загрузки страницы.
 * - `TOAST` (9999): Всплывающие уведомления поверх всех экранов.
 */

export const Z_INDEX = {
  // Навигация
  BOTTOM_NAV: 50,

  // Модальные окна 1-го уровня (базовые)
  MODAL_BASE: 60,
  CATEGORY_ANALYTICS: 60,
  CATEGORY_FORM: 60,
  SUBSCRIPTION_FORM: 60,

  // Модальные окна 2-го уровня (могут открываться поверх базовых)
  TRANSACTION: 70,
  SUBSCRIPTION_DELETE: 70,

  // Шторка выбора категории
  CATEGORY_SHEET_BACKDROP: 80,
  CATEGORY_SHEET: 85,

  // Диалоги подтверждения и подмодалки поверх всего
  MODAL_CONFIRM: 90,
  CATEGORY_DELETE: 90,
  SCAN_EDIT: 90,

  // Системные полноэкранные оверлеи
  LOADER: 100,
  TOAST: 9999,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
export type ZIndexValue = (typeof Z_INDEX)[ZIndexKey];
