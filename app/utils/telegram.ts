/**
 * @module app/utils/telegram
 * @fileoverview Вспомогательные функции для безопасной работы с Telegram WebApp SDK
 * @description
 * Предоставляет безопасные методы взаимодействия с Telegram WebApp с проверкой версии Bot API.
 */

/**
 * Проверяет поддержку управления вертикальными свайпами (доступно с Bot API 7.7)
 */
export const isVerticalSwipesSupported = (): boolean => {
  if (typeof window === "undefined") return false;
  const tg = window.Telegram?.WebApp;
  return Boolean(
    tg &&
      typeof tg.isVersionAtLeast === "function" &&
      tg.isVersionAtLeast("7.7"),
  );
};

/**
 * Безопасно включает или отключает вертикальные свайпы Telegram (передается флаг enabled).
 */
export const setTelegramVerticalSwipes = (enabled: boolean): void => {
  if (!isVerticalSwipesSupported()) return;
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  try {
    if (enabled) {
      tg.enableVerticalSwipes?.();
    } else {
      tg.disableVerticalSwipes?.();
    }
  } catch (err) {
    console.warn("[Telegram WebApp] Ошибка переключения вертикальных свайпов:", err);
  }
};
