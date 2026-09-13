/**
 * @module app/composables/useAuth
 * @fileoverview Composable для глобального управления состоянием аутентификации пользователя
 * @description
 * Этот модуль предоставляет реактивный доступ к сессионным данным пользователя и JWT токену,
 * а также инкапсулирует методы входа через Telegram Mini App и выхода из системы.
 * Использует глобальное состояние Nuxt `useState` для сохранения контекста между компонентами.
 * ---
 * ### Логика работы:
 * 1. `State Management`: Хранит токен сессии (`auth:token`) и данные профиля (`auth:user`) в реактивном `useState`
 * 2. `Computed Auth State`: Вычисляет статус авторизации `isAuthenticated` на основе одновременного наличия токена и пользователя
 * 3. `Telegram Login`: Отправляет строку `initData` на endpoint `/api/auth/validate`, сохраняет выданный JWT токен и профиль
 * 4. `Logout`: Очищает реактивное состояние сессии (сбрасывает токен и профиль в `null`)
 *
 * ### API:
 * - `token: Ref<string | null>`: Текущий JWT токен сессии
 * - `user: Ref<User | null>`: Данные профиля авторизованного пользователя
 * - `isAuthenticated: ComputedRef<boolean>`: Флаг наличия активной авторизованной сессии
 * - `loginWithTelegram(initData)`: Выполняет вход с валидацией Telegram initData на сервере
 * - `logout()`: Завершает сессию и очищает локальное состояние
 *
 * ### Параметры loginWithTelegram:
 * - `initData: string` — строка параметров запуска Telegram Mini App с криптографическим хэшем
 *
 * ### Особенности:
 * - Использование `useState` гарантирует SSR-безопасность и синхронизацию состояния между страницами и компонентами
 * - Stateless-архитектура: сессия держится на клиенте и валидируется на сервере при каждом запросе через Bearer-токен
 * - Автоматический сброс состояния при ошибке аутентификации
 *
 * ### Примечания:
 * - Метод `loginWithTelegram` возвращает `true` при успешном входе и `false` при возникновении ошибки
 * - Не хранит чувствительные данные в `localStorage` по умолчанию, поддерживая модель безопасности Mini App
 *
 * ### Зависимости:
 * - Endpoint `/api/auth/validate` для валидации подписи и выпуска JWT
 */

export interface User {
  id: string;
  telegram_id: number;
  username: string | null;
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
    secure: true,
  });
  const userCookie = useCookie<User | null>("auth_user", {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
    secure: true,
  });

  const token = useState<string | null>("auth:token", () => tokenCookie.value ?? null);
  const user = useState<User | null>("auth:user", () => userCookie.value ?? null);
  const tgUser = useState<TgUser | null>("auth:tgUser", () => null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  const initTelegramUser = () => {
    if (import.meta.client && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      tgUser.value = window.Telegram.WebApp.initDataUnsafe.user;
    }
  };

  const loginWithTelegram = async (initData: string) => {
    try {
      const response = await $fetch<{ token: string; user: User }>(
        "/api/auth/validate",
        {
          method: "POST",
          body: { initData },
        },
      );
      token.value = response.token;
      user.value = response.user;
      tokenCookie.value = response.token;
      userCookie.value = response.user;

      return true;
    } catch (error) {
      console.error("Ошибка авторизации:", error);
      token.value = null;
      user.value = null;
      tokenCookie.value = null;
      userCookie.value = null;
      return false;
    }
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
    token.value = null;
    user.value = null;
    tokenCookie.value = null;
    userCookie.value = null;
    tgUser.value = null;
  };

  const devLogin = async () => {
    try {
      const response = await $fetch<{ token: string; user: User }>(
        "/api/auth/dev-login",
        { method: "POST" },
      );
      token.value = response.token;
      user.value = response.user;
      tokenCookie.value = response.token;
      userCookie.value = response.user;
      
      // Фейковые данные Telegram для разработки
      tgUser.value = {
        id: 12345678,
        first_name: "Иван",
        username: "dev_user",
        // Используем картинку для разработки
        photo_url: "https://i.pravatar.cc/150?u=a042581f4e29026704d", 
      };

      return true;
    } catch (error) {
      console.error("Ошибка dev-авторизации:", error);
      token.value = null;
      user.value = null;
      tokenCookie.value = null;
      userCookie.value = null;
      tgUser.value = null;
      return false;
    }
  };

  return {
    token,
    user,
    tgUser,
    isAuthenticated,
    loginWithTelegram,
    getTelegramInitData,
    initTelegramAuth,
    initTelegramUser,
    devLogin,
    logout,
  };
};
