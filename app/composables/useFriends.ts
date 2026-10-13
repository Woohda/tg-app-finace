/**
 * @module app/composables/useFriends
 * @fileoverview Управление списком друзей и генерацией инвайт-ссылок
 */
import { ref } from "vue";
import type { UserFriend } from "~/types/friends";

export const useFriends = () => {
  const api = useApi();
  const toast = useAppToast();
  const { user } = useAuth();

  const friends = useGlobalFriends();
  const pending = ref(false);
  const isLoaded = useState<boolean>("global_user_friends_loaded", () => false);

  /**
   * Загрузка списка друзей текущего пользователя
   */
  const fetchFriends = async (force = false) => {
    if (!force && isLoaded.value) {
      return friends.value;
    }

    pending.value = true;
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
    }
  };

  /**
   * Получение персональной инвайт-ссылки
   * @param groupId опциональный ID группы для инвайта напрямую в группу
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
