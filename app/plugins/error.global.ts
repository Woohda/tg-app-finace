/**
 * @module app/plugins/error.global
 * @fileoverview Глобальный перехватчик и логгер необработанных ошибок приложения
 * @description
 * Регистрирует обработчики ошибок Vue (`errorHandler`), оконных ошибок (`window.error`)
 * и необработанных отклонений промисов (`unhandledrejection`).
 * Отправляет подробный диагностический отчет в Telegram-бот администратора через `/api/bot/log-error`.
 * ---
 * ### Логика работы:
 * 1. Игнорирует ошибки на этапе SSR (серверные логи выводятся в консоль Nitro).
 * 2. Фильтрует известные безвредные сбои (например, первичное отсутствие глобального объекта `Telegram`).
 * 3. Идентифицирует пользователя по каскадной схеме:
 *    - Реактивное состояние авторизации `useAuth().user`.
 *    - Значение cookie `auth_user`.
 *    - Сырые данные Telegram WebApp `window.Telegram?.WebApp?.initDataUnsafe?.user`.
 *    - Значение по умолчанию `"Guest"`.
 * 4. Формирует тело лога (сообщение, стек вызовов, текущий URL, ID пользователя) и отправляет на `/api/bot/log-error`.
 */
import type { User } from "~/composables/useAuth";

export default defineNuxtPlugin((nuxtApp) => {
  const { user } = useAuth();
  const userCookie = useCookie<User | null>("auth_user");

  const resolveUserId = (): string => {
    // 1. Попытка получить из реактивного состояния авторизации useAuth или сохраненной куки
    const activeUser = user.value ?? userCookie.value;
    if (activeUser) {
      if (activeUser.telegram_id) {
        return activeUser.username
          ? `@${activeUser.username} (${activeUser.telegram_id})`
          : String(activeUser.telegram_id);
      }
      return activeUser.id || "Guest";
    }

    // 2. Фоллбек: сырые данные пользователя из Telegram WebApp (если авторизация еще не завершена)
    if (import.meta.client) {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.id) {
        return tgUser.username ? `@${tgUser.username} (${tgUser.id})` : String(tgUser.id);
      }
    }

    return "Guest";
  };

  const sendErrorLog = (err: unknown, info: string) => {
    // Не отправляем на сервере (во время SSR), чтобы не спамить
    // Серверные логи можно смотреть в консоли
    if (!import.meta.client) return;

    try {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : "";

      // Игнорируем частые ошибки, если нужно
      if (message.includes("Telegram") && message.includes("not defined")) return;

      const userId = resolveUserId();

      $fetch("/api/bot/log-error", {
        method: "POST",
        body: {
          message: `[${info}] ${message}`,
          stack,
          url: window.location.href,
          userId,
        },
      }).catch((e) => console.error("Failed to send error log", e));
    } catch (e) {
      console.error("Error in error handler", e);
    }
  };

  nuxtApp.vueApp.config.errorHandler = (error, _instance, info) => {
    console.error("Vue Error Captured:", error, info);
    sendErrorLog(error, `Vue Error: ${info}`);
  };

  if (import.meta.client) {
    window.addEventListener("error", (event) => {
      sendErrorLog(event.error || event.message, "Window Error");
    });

    window.addEventListener("unhandledrejection", (event) => {
      sendErrorLog(event.reason, "Unhandled Rejection");
    });
  }
});
