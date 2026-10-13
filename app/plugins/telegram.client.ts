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
    setTelegramVerticalSwipes(false);
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

  // Обработка инвайт-ссылок совместных трат и друзей (join_groupId или friend_userId)
  const rawStartParam =
    tg.initDataUnsafe?.start_param ||
    (typeof route.query.startapp === "string" ? route.query.startapp : undefined) ||
    (typeof route.query.tgWebAppStartParam === "string" ? route.query.tgWebAppStartParam : undefined);

  if (rawStartParam && (rawStartParam.startsWith("join_") || rawStartParam.startsWith("friend_"))) {
    const sessionKey = `fino_processed_invite_${rawStartParam}`;
    if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      const api = useApi();
      const toast = useAppToast();
      try {
        const result = await api<import("~/types/friends").JoinInviteResult>("/api/friends/join", {
          method: "POST",
          body: { startParam: rawStartParam },
        });

        if (result.success) {
          if (result.groupId) {
            toast.success("Вы добавлены в группу!", result.groupName ? `«${result.groupName}»` : undefined);
            if (route.path !== `/split/${result.groupId}`) {
              router.push(`/split/${result.groupId}`);
            }
          } else if (result.friendName) {
            toast.success("Новый друг!", `Вы добавили ${result.friendName} в список друзей`);
          }
        } else if (result.message) {
          toast.info("Приглашение", result.message);
        }
      } catch (err) {
        console.warn("[Telegram Plugin] Ошибка обработки инвайт-ссылки:", err);
      }
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
