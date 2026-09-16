/**
 * @module app/middleware/auth.global
 * @fileoverview Глобальный middleware для проверки авторизации
 * @description
 * Перехватывает все переходы по роутам на стороне клиента.
 * Если пользователь не авторизован (нет токена в `useAuth`), принудительно 
 * перенаправляет на страницу `/login`.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth();

  // Исключаем саму страницу логина из проверки, чтобы не было бесконечного редиректа
  if (to.path === "/login") {
    return;
  }

  // Если нет токена и юзера - на страницу логина
  if (!isAuthenticated.value) {
    return navigateTo("/login");
  }
});
