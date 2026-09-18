import { useLocalStorage } from "@vueuse/core";

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type: "expense" | "income" | "system" | "error";
  date: string; // ISO string
}

const MAX_NOTIFICATIONS = 50;

export const useNotifications = () => {
  // Храним в LocalStorage (сохраняется между перезапусками)
  const history = useLocalStorage<NotificationItem[]>("app-notifications", []);

  const add = (
    title: string,
    options?: { message?: string; type?: NotificationItem["type"] }
  ) => {
    const newItem: NotificationItem = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message: options?.message,
      type: options?.type || "system",
      date: new Date().toISOString(),
    };

    // Добавляем в начало списка
    history.value.unshift(newItem);

    // Ограничиваем количество записей
    if (history.value.length > MAX_NOTIFICATIONS) {
      history.value = history.value.slice(0, MAX_NOTIFICATIONS);
    }
  };

  const clear = () => {
    history.value = [];
  };
  
  // Количество непрочитанных (в простом варианте - все)
  // Можно доработать логику 'read', если потребуется
  const count = computed(() => history.value.length);

  return {
    history,
    add,
    clear,
    count
  };
};
