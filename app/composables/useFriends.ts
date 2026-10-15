/**
 * @module app/composables/useFriends
 * @fileoverview Управление списком друзей и генерацией инвайт-ссылок
 * @description
 * Обеспечивает получение списка подтвержденных друзей пользователя и генерацию
 * глубоких ссылок Telegram (deep link) для шеринга и инвайтов в группы сплита.
 * ---
 * ### Логика работы:
 * 1. Получение друзей (`fetchFriends`) через `/api/friends` с кешированием в `useGlobalFriends`.
 * 2. Генерация ссылки приглашения (`getInviteLink`) с параметром `friend_{id}` или `join_{groupId}`.
 * 3. Отправка через нативный диалог Telegram (`tg.openTelegramLink`) или буфер обмена браузера.
 */
import { ref } from "vue";
import type { UserFriend } from "~/types/friends";

let inFlightFriendsFetch: Promise<UserFriend[]> | null = null;

export const useFriends = () => {
  const api = useApi();
  const toast = useAppToast();
  const { user, token } = useAuth();

  const friends = useGlobalFriends();
  const pending = ref(false);
  const isLoaded = useState<boolean>("global_user_friends_loaded", () => false);

  /**
   * Загрузка списка друзей текущего пользователя
   */
  const fetchFriends = async (force = false) => {
    if (import.meta.server && !token.value) {
      return friends.value;
    }
    if (!force && isLoaded.value) {
      return friends.value;
    }
    if (inFlightFriendsFetch) {
      return inFlightFriendsFetch;
    }

    pending.value = true;
    inFlightFriendsFetch = (async () => {
      try {
        const data = await api<UserFriend[]>("/api/friends");
        friends.value = data;
        isLoaded.value = true;
        return data;
      } catch (e) {
        console.warn("Ошибка загрузки списка друзей:", e);
        return [];
      } finally {
        pending.value = false;
        inFlightFriendsFetch = null;
      }
    })();

    return inFlightFriendsFetch;
  };

  /**
   * Получение персональной инвайт-ссылки для добавления в друзья или в группу
   */
  const getInviteLink = (groupId?: string): string => {
    const botUsername = "vfino_bot";

    if (groupId) {
      return `https://t.me/${botUsername}?start=join_${groupId}`;
    }

    if (user.value?.id) {
      return `https://t.me/${botUsername}?start=friend_${user.value.id}`;
    }

    return `https://t.me/${botUsername}`;
  };

  /**
   * Поделиться инвайт-ссылкой через нативный шеринг Telegram или скопировать в буфер
   */
  const shareInvite = async (options?: {
    groupId?: string;
    groupName?: string;
  }) => {
    const link = getInviteLink(options?.groupId);
    const text = options?.groupName
      ? `Присоединяйся к группе совместных трат «${options.groupName}» в FINO!`
      : "Добавляйся ко мне в друзья в FINO для совместных трат!";

    const tg = window?.Telegram?.WebApp;

    if (tg?.openTelegramLink) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
      tg.openTelegramLink(shareUrl);
      return;
    }

    // Фоллбек для обычного браузера: копирование в буфер обмена
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Ссылка скопирована", "Отправьте её другу в Telegram");
    } catch {
      toast.info("Ссылка для приглашения", link);
    }
  };

  return {
    friends,
    pending,
    fetchFriends,
    getInviteLink,
    shareInvite,
  };
};
