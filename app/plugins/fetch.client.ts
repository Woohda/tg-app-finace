/**
 * @module app/plugins/fetch.client
 * @fileoverview Глобальный перехватчик API запросов и обработка 401 Unauthorized
 * @description
 * Настраивает глобальный `$fetch` для перехвата 401 ошибок.
 * При истечении JWT токена пытается сделать тихий рефреш через Telegram initData,
 * если не получается — разлогинивает и перекидывает на страницу логина.
 * ---
 * ### Логика работы:
 * 1. Проверяет ответ на статус 401.
 * 2. Игнорирует роуты авторизации (чтобы не уйти в бесконечный цикл).
 * 3. Пытается сделать `initTelegramAuth()` (или `devLogin()` в dev режиме).
 * 4. В случае успеха перезагружает страницу для повторения упавших запросов.
 * 5. В случае провала делает `logout()` и редиректит на `/login`.
 */
export default defineNuxtPlugin(() => {
  const { initTelegramAuth, devLogin, logout } = useAuth();
  const router = useRouter();

  globalThis.$fetch = $fetch.create({
    async onResponseError({ request, response }) {
      if (response.status === 401) {
        // Защита от бесконечного цикла, если сам логин отдает 401
        if (request.toString().includes("/api/auth/")) {
          logout();
          router.replace("/login");
          return;
        }

        try {
          let success = false;
          if (import.meta.dev && !window.Telegram?.WebApp?.initData) {
            success = await devLogin();
          } else {
            success = await initTelegramAuth();
          }

          if (success) {
            // Рефреш успешен. Перезагружаем SPA, чтобы упавшие запросы выполнились заново.
            window.location.reload();
          } else {
            // Рефреш провалился (initData тоже истек)
            logout();
            router.replace("/login");
          }
        } catch (error) {
          console.error("[Fetch Plugin] Ошибка при попытке рефреша токена:", error);
          logout();
          router.replace("/login");
        }
      }
    },
  });
});
