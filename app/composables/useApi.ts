/**
 * @module app/composables/useApi
 * @fileoverview Обертка над $fetch для автоматического обновления токена
 * @description
 * Подставляет Authorization заголовок во все запросы.
 * Если сервер возвращает 401 Unauthorized, пытается прозрачно обновить токен
 * через initTelegramAuth() и повторяет запрос без перезагрузки страницы.
 */
import { useAuth } from "./useAuth";

export const useApi = () => {
  const { token, initTelegramAuth, devLogin, logout } = useAuth();
  const router = useRouter();

  const api = async <T>(
    request: string,
    options?: Parameters<typeof $fetch>[1],
  ): Promise<T> => {
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`;
    }

    try {
      return (await $fetch<T>(request, { ...options, headers })) as T;
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      
      // Логируем все ошибки, кроме 401 (так как мы их обрабатываем)
      if (import.meta.client && err.response?.status !== 401) {
        $fetch("/api/bot/log-error", {
          method: "POST",
          body: {
            message: `[API Error] ${request}: ${e instanceof Error ? e.message : String(e)}`,
            stack: e instanceof Error ? e.stack : String(e),
            url: window.location.href,
          }
        }).catch(() => {});
      }

      if (err.response?.status === 401) {
        // Защита от бесконечного цикла, если упал сам логин
        if (request.includes("/api/auth/")) {
          throw e;
        }

        let success = false;
        try {
          if (import.meta.dev && !window.Telegram?.WebApp?.initData) {
            success = await devLogin();
          } else {
            success = await initTelegramAuth();
          }
        } catch (err) {
          console.error("Ошибка обновления токена:", err);
        }

        if (success) {
          // Повторяем запрос с новым токеном
          headers.Authorization = `Bearer ${token.value}`;
          return (await $fetch<T>(request, { ...options, headers })) as T;
        } else {
          // Рефреш провалился - разлогиниваем
          logout();
          router.replace("/login");
          throw e;
        }
      }
      throw e;
    }
  };

  return api;
};
