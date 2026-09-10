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
