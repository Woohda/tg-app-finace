/**
 * @module composables/useAuth
 * @fileoverview Глобальное состояние авторизации пользователя.
 * @description
 * Хранит JWT токен и данные профиля в реактивном состоянии памяти `useState`.
 * Предоставляет методы для аутентификации через Telegram и выхода из системы.
 */

interface User {
  id: string;
  telegram_id: number;
  username: string | null;
}

export const useAuth = () => {
  const token = useState<string | null>("auth:token", () => null);
  const user = useState<User | null>("auth:user", () => null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

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

      return true;
    } catch (error) {
      console.error("Ошибка авторизации:", error);
      token.value = null;
      user.value = null;
      return false;
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
  };

  return {
    token,
    user,
    isAuthenticated,
    loginWithTelegram,
    logout,
  };
};
