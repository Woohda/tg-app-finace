/**
 * @module server/utils/botHandlers
 * @fileoverview Единый фасад обработчиков событий Telegram-бота.
 * @description
 * Агрегирует и реэкспортирует модули логики бота:
 * - `botParser`: разбор текста сообщений (суммы, названия).
 * - `botMessages`: обработка входящих текстовых сообщений и подбор категорий.
 * - `botCallbacks`: обработка нажатий на инлайн-кнопки (оплата подписок, выбор категорий).
 * - `botCommands`: обработка команд (/web для входа в Safari / PWA).
 */

export * from "./botParser";
export * from "./botMessages";
export * from "./botCallbacks";
export * from "./botCommands";
