export default defineNuxtPlugin((nuxtApp) => {
  const sendErrorLog = (err: unknown, info: string) => {
    // Не отправляем на сервере (во время SSR), чтобы не спамить
    // Серверные логи можно смотреть в консоли
    if (!import.meta.client) return;

    try {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : "";
      
      // Игнорируем частые ошибки, если нужно
      if (message.includes("Telegram") && message.includes("not defined")) return;

      const userStr = localStorage.getItem("auth_user");
      let userId = "Guest";
      if (userStr) {
        try {
          const user = JSON.parse(userStr) as { id?: string; telegram_id?: number };
          userId = user?.telegram_id?.toString() || user?.id || "Guest";
        } catch {
          // Игнорируем ошибки парсинга JSON
        }
      }

      $fetch("/api/bot/log-error", {
        method: "POST",
        body: {
          message: `[${info}] ${message}`,
          stack,
          url: window.location.href,
          userId,
        },
      }).catch(e => console.error("Failed to send error log", e));
    } catch (e) {
      console.error("Error in error handler", e);
    }
  };

  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
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
