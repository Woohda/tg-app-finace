/**
 * @module app/composables/useAuth
 * @fileoverview Глобальное управление состоянием аутентификации пользователя
 *
 * @description
 * Предоставляет реактивный доступ к данным пользователя, отображаемому имени,
 * аватару и JWT токену.
 * Инкапсулирует методы входа через Telegram Mini App (или dev-режим) и выхода.
 *
 * ### Логика:
 * - Хранит `token` и `user` в `useState` и куках для SSR-безопасности.
 * - Вычисляет отображаемое имя `userName` и аватар `avatarUrl` на основе данных Telegram/профиля.
 * - При вызове `loginWithTelegram` отправляет `initData` на сервер для получения JWT.
 * - При вызове `devLogin` выполняет тестовый вход (для локальной разработки без TG).
 */

export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name?: string | null;
  photo_url?: string | null;
  timezone?: string | null;
}

export interface TgUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export const useAuth = () => {
  const tokenCookie = useCookie<string | null>("auth_token", {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  const userCookie = useCookie<User | null>("auth_user", {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  const token = useState<string | null>(
    "auth:token",
    () => tokenCookie.value ?? null,
  );
  const user = useState<User | null>(
    "auth:user",
    () => userCookie.value ?? null,
  );
  const tgUser = useState<TgUser | null>("auth:tgUser", () => null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  const userName = computed(() => {
    if (user.value?.first_name) {
      return user.value.first_name;
    }
    if (tgUser.value?.first_name) {
      return tgUser.value.first_name;
    }
    if (user.value?.username) {
      return `@${user.value.username}`;
    }
    return "Пользователь";
  });

  const avatarUrl = computed(
    () => user.value?.photo_url || tgUser.value?.photo_url || null,
  );

  const initTelegramUser = () => {
    if (import.meta.client && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      tgUser.value = window.Telegram.WebApp.initDataUnsafe.user;
    }
  };

  // Восстановление сессии из localStorage для iOS PWA (защита от Apple ITP)
  if (import.meta.client && !token.value) {
    try {
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("auth_user");
      if (storedToken && storedUser) {
        token.value = storedToken;
        user.value = JSON.parse(storedUser);
        tokenCookie.value = storedToken;
        userCookie.value = user.value;
      }
    } catch {
      // Игнорируем ошибки парсинга хранилища
    }
  }

  const syncStorage = (newToken: string | null, newUser: User | null) => {
    token.value = newToken;
    user.value = newUser;
    tokenCookie.value = newToken;
    userCookie.value = newUser;

    if (import.meta.client) {
      if (newToken && newUser) {
        localStorage.setItem("auth_token", newToken);
        localStorage.setItem("auth_user", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
  };

  const loginWithTelegram = async (initData: string): Promise<boolean> => {
    try {
      const timezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined;

      const response = await $fetch<{ token: string; user: User }>(
        "/api/auth/validate",
        {
          method: "POST",
          body: { initData, timezone },
        },
      );

      syncStorage(response.token, response.user);
      return true;
    } catch (error: unknown) {
      console.error("Ошибка авторизации:", error);
      const err = error as { response?: { status?: number }; statusCode?: number };
      const status = err.response?.status || err.statusCode;

      // Сбрасываем сессию ТОЛЬКО если сервер явно отклонил подпись (401)
      // или если у пользователя вообще не было токена
      if (status === 401 || !token.value) {
        syncStorage(null, null);
      }
      return false;
    }
  };

  const loginWithTicket = async (ticket: string): Promise<boolean> => {
    try {
      const timezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined;

      const response = await $fetch<{ token: string; user: User }>(
        "/api/auth/web-login",
        {
          method: "POST",
          body: { ticket, timezone },
        },
      );

      syncStorage(response.token, response.user);
      return true;
    } catch (error: unknown) {
      console.error("Ошибка входа по тикету:", error);
      return false;
    }
  };

  const getWebLoginLink = async (): Promise<string> => {
    const response = await $fetch<{ url: string }>("/api/auth/web-link", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });
    return response.url;
  };

  const getTelegramInitData = (): string => {
    if (import.meta.client && window.Telegram?.WebApp?.initData) {
      return window.Telegram.WebApp.initData;
    }
    return "";
  };

  const initTelegramAuth = async (): Promise<boolean> => {
    initTelegramUser(); // Попробуем вытащить данные юзера при логине
    const initData = getTelegramInitData();
    if (!initData) {
      return false;
    }
    return await loginWithTelegram(initData);
  };

  const logout = () => {
    syncStorage(null, null);
    tgUser.value = null;
  };

  const devLogin = async () => {
    try {
      const response = await $fetch<{ token: string; user: User }>(
        "/api/auth/dev-login",
        { method: "POST" },
      );
      syncStorage(response.token, response.user);

      // Фейковые данные Telegram для разработки
      tgUser.value = {
        id: 12345678,
        first_name: "Иван",
        username: "dev_user",
        photo_url: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
      };

      return true;
    } catch (error) {
      console.error("Ошибка dev-авторизации:", error);
      syncStorage(null, null);
      tgUser.value = null;
      return false;
    }
  };

  return {
    token,
    user,
    tgUser,
    userName,
    avatarUrl,
    isAuthenticated,
    loginWithTelegram,
    loginWithTicket,
    getWebLoginLink,
    getTelegramInitData,
    initTelegramAuth,
    initTelegramUser,
    devLogin,
    logout,
  };
};

