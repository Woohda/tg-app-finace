/**
 * @module app/utils/haptics
 * @fileoverview Обёртки для тактильного отклика Telegram (HapticFeedback)
 */

export const getHapticFeedback = () => {
  const isAvailable = () => {
    return (
      typeof window !== "undefined" &&
      !!window.Telegram?.WebApp?.HapticFeedback &&
      typeof window.Telegram.WebApp.isVersionAtLeast === "function" &&
      window.Telegram.WebApp.isVersionAtLeast("6.1")
    );
  };

  const impact = (style: "light" | "medium" | "heavy" | "rigid" | "soft") => {
    if (isAvailable()) {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    }
  };

  const notification = (type: "error" | "success" | "warning") => {
    if (isAvailable()) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    }
  };

  const selection = () => {
    if (isAvailable()) {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    }
  };

  return { impact, notification, selection };
};
