/**
 * @module app/composables/useApi
 * @fileoverview Унифицированная обертка над $fetch с проактивной авторизацией и защитой от сетевых сбоев
 * @description
 * Централизованный транспортный уровень приложения:
 * 1. Проактивная авторизация (`ensureAuth`): перед отправкой защищенных запросов на клиенте
 *    гарантирует готовность сессии и валидность JWT, предотвращая первичные 401 ошибки.
 * 2. SSR-guard: на сервере при отсутствии валидной сессии немедленно прерывает выполнение с 401
 *    без лишних сетевых вызовов и повреждения клиентских кук.
 * 3. Single-Flight Lock: при неожиданном получении 401 выполняет ровно 1 повторную авторизацию,
 *    а параллельные запросы ожидают завершения единого промиса.
 * 4. Адаптивный повтор (backoff):
 *    - При сбросе мертвого сокета WebKit (Load failed) выдерживает паузу 350мс и повторяет запрос.
 *    - При холодном старте базы (502/503/504) для идемпотентных методов выдерживает 800мс (до 2 повторов).
 *    - Для неидемпотентных запросов (POST) повтор при 5xx запрещен во избежание дублирования данных.
 * 5. Логирование в бот: ошибки отправляются только если все попытки исчерпаны.
 * ---
 * ### Логика работы:
 * 1. Проверка маршрута: если маршрут защищенный, гарантируется наличие токена через `ensureAuth()`.
 * 2. Подстановка заголовка `Authorization: Bearer <token>`.
 * 3. Выполнение запроса с обработкой 401, сетевых обрывов сокета и 5xx холодного старта.
 * 4. Перенаправление на `/login` для веб-пользователей при невозможности авторизации.
 */
import { useAuth, isJwtExpired } from "./useAuth";

// Единый разделяемый промис обновления токена для предотвращения лавины запросов
let activeRefreshPromise: Promise<boolean> | null = null;

export const useApi = () => {
  const { token, ensureAuth, logout, user } = useAuth();
  const router = useRouter();

  const api = async <T>(
    request: string,
    options?: Parameters<typeof $fetch>[1],
  ): Promise<T> => {
    const isAuthRoute = request.includes("/api/auth/");

    // Проактивная защита и синхронизация авторизации перед сетевым запросом
    if (!isAuthRoute) {
      if (import.meta.server) {
        if (!token.value || isJwtExpired(token.value)) {
          throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized on SSR",
          });
        }
      } else {
        if (!token.value || isJwtExpired(token.value)) {
          const ok = await ensureAuth();
          if (!ok) {
            const isInsideTg =
              typeof window !== "undefined" &&
              (window.Telegram?.WebApp?.initData ||
                window.location.hash.includes("tgWebAppData"));
            if (!isInsideTg && router.currentRoute.value.path !== "/login") {
              router.replace("/login");
            }
            throw createError({
              statusCode: 401,
              statusMessage: "Unauthorized",
            });
          }
        }
      }
    }

    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };

    const method = String(options?.method || "GET").toUpperCase();
    const isIdempotent = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"].includes(
      method,
    );

    // Мобильный таймаут: 14 секунд вместо 25, чтобы интерфейс не зависал на минуту
    const timeout = options?.timeout ?? 14000;

    // Идемпотентные запросы (GET/PUT/DELETE) могут повторяться до 2 раз (всего 3 попытки).
    // Неидемпотентные (POST/PATCH) повторяются ровно 1 раз и только при обрыве сокета (всего 2 попытки).
    const maxAttempts = isIdempotent ? 3 : 2;

    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt++;

      if (token.value) {
        headers.Authorization = `Bearer ${token.value}`;
      }

      const fetchOptions: NonNullable<Parameters<typeof $fetch>[1]> = {
        ...options,
        headers,
        timeout,
        retry: 0, // Управляем повторами адаптивно на уровне обертки с корректными задержками
      };

      try {
        return (await $fetch<T>(request, fetchOptions)) as T;
      } catch (e: unknown) {
        lastError = e;
        const err = e as {
          response?: { status?: number };
          statusCode?: number;
          name?: string;
          message?: string;
        };

        const status = err.response?.status || err.statusCode;

        // 1. Single-Flight Lock: перехват 401 Unauthorized
        if (status === 401 && !isAuthRoute) {
          // На сервере (SSR) не пытаемся логиниться и не затираем сессионные куки клиента
          if (import.meta.server) {
            throw lastError;
          }

          if (!activeRefreshPromise) {
            activeRefreshPromise = (async () => {
              try {
                return await ensureAuth();
              } catch (refreshErr) {
                console.error("[useApi] Ошибка повторной авторизации:", refreshErr);
                return false;
              } finally {
                activeRefreshPromise = null;
              }
            })();
          }

          const refreshSuccess = await activeRefreshPromise;
          if (refreshSuccess) {
            continue; // Повторяем с новым токеном на следующей итерации
          } else {
            const isInsideTg =
              typeof window !== "undefined" &&
              (window.Telegram?.WebApp?.initData ||
                window.location.hash.includes("tgWebAppData"));
            logout();
            if (!isInsideTg && router.currentRoute.value.path !== "/login") {
              router.replace("/login");
            }
            throw lastError;
          }
        }

        // 2. Детектирование падения мертвого сокета в Safari/WebKit
        const isAbort = err.name === "AbortError" && !options?.timeout;
        const isTransportDrop =
          !err.response &&
          !isAbort &&
          ((e instanceof Error &&
            (e.message.includes("Load failed") ||
              e.message.includes("Failed to fetch") ||
              e.message.includes("NetworkError") ||
              e.name === "FetchError" ||
              e.name === "TypeError")) ||
            String(e).includes("Load failed"));

        // 3. Детектирование холодного старта сервера/базы (502 Bad Gateway, 503, 504 Gateway Timeout, 408)
        const isServerColdStart =
          status !== undefined && [408, 502, 503, 504].includes(status);

        // Условия допустимости повтора:
        // - При сбросе сокета (Load failed): повторяем любой метод (запрос не достиг сервера).
        // - При холодном старте (502/504): повторяем ТОЛЬКО идемпотентные запросы (GET/PUT/DELETE).
        const canRetry =
          attempt < maxAttempts &&
          options?.retry !== false &&
          (isTransportDrop || (isIdempotent && isServerColdStart));

        if (!canRetry) {
          break;
        }

        // Адаптивная задержка:
        // 350мс для WebKit (гарантированное освобождение сокета в пуле ОС).
        // 800мс для базы данных (время на прогрев пула соединений Supabase).
        const delayMs = isTransportDrop ? 350 : 800;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Логируем в Telegram-бот только окончательные неразрешимые ошибки (исключая 401 и сам логгер)
    const finalErr = lastError as { response?: { status?: number }; statusCode?: number };
    if (
      import.meta.client &&
      finalErr?.response?.status !== 401 &&
      finalErr?.statusCode !== 401 &&
      !request.includes("/api/bot/log-error")
    ) {
      $fetch("/api/bot/log-error", {
        method: "POST",
        body: {
          message: `[API Error] ${request}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
          stack:
            lastError instanceof Error ? lastError.stack : String(lastError),
          url: window.location.href,
          userId: user.value?.telegram_id || user.value?.id || "Unknown",
        },
      }).catch(() => {});
    }

    throw lastError;
  };

  return api;
};
