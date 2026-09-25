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
    tg.disableVerticalSwipes?.();
  } catch (err) {
    console.warn("[Telegram Plugin] Ошибка при вызове ready/expand/disableVerticalSwipes:", err);
  }

  const { isAuthenticated, loginWithTelegram } = useAuth();
  const route = useRoute();
  const router = useRouter();

  if (tg.initData) {
    if (!isAuthenticated.value) {
      // Первичный вход: ждем авторизации перед переходом
      const success = await loginWithTelegram(tg.initData);
      if (success && route.path === "/login") {
        router.replace("/");
      }
    } else {
      // Пользователь уже вошел: делаем фоновую тихую авторизацию и прогрев БД без блокировки UI
      loginWithTelegram(tg.initData).catch((err) => {
        console.warn("[Telegram Plugin] Ошибка тихой фоновой авторизации:", err);
      });
    }
  }

  // При возврате приложения из фона (пользователь свернул Telegram и вернулся)
  if (typeof document !== "undefined") {
    let lastWarmup = Date.now();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        // Если прошло больше 60 секунд с последнего обращения и есть initData
        if (now - lastWarmup > 60_000 && tg.initData) {
          lastWarmup = now;
          loginWithTelegram(tg.initData).catch(() => {});
        }
      }
    });
  }
});
