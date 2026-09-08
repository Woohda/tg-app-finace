/**
 * @module app/plugins/telegram.client
 * @fileoverview Клиентский плагин интеграции с Telegram WebApp SDK и авто-аутентификации.
 * @description
 * Инициализирует окружение Telegram Mini App при запуске приложения:
 * 1. Вызывает `ready()` и `expand()` для адаптации экрана под интерфейс Telegram.
 * 2. Считывает криптографически подписанный `initData`.
 * 3. Если пользователь ещё не авторизован и `initData` доступен, выполняет фоновую авторизацию через `loginWithTelegram`.
 */
export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return;

  const tg = window.Telegram?.WebApp;
  if (!tg) {
    console.info("[Telegram Plugin] Telegram WebApp SDK не обнаружен (запуск в обычном браузере)");
    return;
  }

  // Сообщаем Telegram о готовности интерфейса и раскрываем окно на максимум
  try {
    tg.ready();
    tg.expand();
  } catch (err) {
    console.warn("[Telegram Plugin] Ошибка при вызове ready/expand:", err);
  }

  const { isAuthenticated, loginWithTelegram } = useAuth();
  const route = useRoute();
  const router = useRouter();

  // Если есть подписанные данные от Telegram и пользователь еще не вошел
  if (tg.initData && !isAuthenticated.value) {
    const success = await loginWithTelegram(tg.initData);
    if (success && route.path === "/login") {
      router.replace("/");
    }
  }
});
