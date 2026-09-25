/**
 * @module app/composables/useSubscriptions
 * @fileoverview Управление регулярными ежемесячными платежами пользователя
 * @description
 * Обеспечивает получение, создание, редактирование и удаление регулярных платежей.
 * Вычисляет общую сумму подписок в месяц и формирует список ближайших списаний.
 */
import { ref, computed } from "vue";
import { parseApiError } from "~/utils/api";
import { formatAmount } from "~/utils";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  day_of_month: number;
  is_active: boolean;
  category_id: string | null;
  categoryName: string;
  categoryIcon: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpcomingSubscription extends Subscription {
  daysUntil: number; // 0 = сегодня, 1 = завтра, >1 = через N дней, <0 = прошло в этом месяце
  statusLabel: string;
  statusType: "today" | "soon" | "upcoming" | "past";
}

export const useSubscriptions = () => {
  const api = useApi();
  const toast = useAppToast();
  const notifications = useNotifications();
  const subscriptions = useState<Subscription[]>("subscriptions:list", () => []);
  const pending = ref(false);
  const error = ref<string | null>(null);

  const fetchSubscriptions = async (force = false) => {
    if (!force && subscriptions.value.length > 0) {
      return;
    }

    pending.value = true;
    error.value = null;

    try {
      const data = await api<Subscription[]>("/api/subscriptions");
      subscriptions.value = data;
    } catch (e) {
      console.error("Ошибка загрузки регулярных платежей:", e);
      error.value = parseApiError(e, "Не удалось загрузить регулярные платежи");
    } finally {
      pending.value = false;
    }
  };

  const createSubscription = async (data: {
    name: string;
    amount: number;
    day_of_month: number;
    category_id?: string | null;
  }) => {
    try {
      const newSub = await api<Subscription>("/api/subscriptions", {
        method: "POST",
        body: data,
      });
      subscriptions.value = [...subscriptions.value, newSub].sort(
        (a, b) => a.day_of_month - b.day_of_month,
      );
      toast.success("Регулярный платёж добавлен");
      notifications.add("Регулярный платёж добавлен", {
        message: `${newSub.name} — ${formatAmount(newSub.amount)} (${newSub.day_of_month}-го числа)`,
        type: "system",
      });
      return { success: true, data: newSub };
    } catch (e) {
      console.error("Ошибка добавления регулярного платежа:", e);
      const msg = parseApiError(e, "Не удалось добавить регулярный платёж");
      toast.error("Ошибка", msg);
      return { success: false, error: msg };
    }
  };

  const updateSubscription = async (
    id: string,
    data: {
      name?: string;
      amount?: number;
      day_of_month?: number;
      category_id?: string | null;
      is_active?: boolean;
    },
  ) => {
    try {
      const updated = await api<Subscription>(`/api/subscriptions/${id}`, {
        method: "PUT",
        body: data,
      });

      subscriptions.value = subscriptions.value
        .map((s) => (s.id === id ? updated : s))
        .sort((a, b) => a.day_of_month - b.day_of_month);

      toast.success("Регулярный платёж обновлен");
      notifications.add("Регулярный платёж обновлен", {
        message: `${updated.name} — ${formatAmount(updated.amount)} (${updated.day_of_month}-го числа)`,
        type: "system",
      });
      return { success: true, data: updated };
    } catch (e) {
      console.error("Ошибка обновления регулярного платежа:", e);
      const msg = parseApiError(e, "Не удалось обновить регулярный платёж");
      toast.error("Ошибка", msg);
      return { success: false, error: msg };
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      const sub = subscriptions.value.find((s) => s.id === id);
      await api(`/api/subscriptions/${id}`, {
        method: "DELETE",
      });
      subscriptions.value = subscriptions.value.filter((s) => s.id !== id);
      toast.success("Регулярный платёж удален");
      if (sub) {
        notifications.add("Регулярный платёж удален", {
          message: `${sub.name} — ${formatAmount(sub.amount)}`,
          type: "system",
        });
      }
      return { success: true };
    } catch (e) {
      console.error("Ошибка удаления регулярного платежа:", e);
      const msg = parseApiError(e, "Не удалось удалить регулярный платёж");
      toast.error("Ошибка", msg);
      return { success: false, error: msg };
    }
  };

  // Общая сумма активных регулярных платежей в месяц
  const totalMonthly = computed(() => {
    return subscriptions.value
      .filter((s) => s.is_active)
      .reduce((sum, s) => sum + s.amount, 0);
  });

  // Список платежей этого месяца с расчетом дней до списания
  const upcomingSubscriptions = computed<UpcomingSubscription[]>(() => {
    const now = new Date();
    const today = now.getDate();
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();

    return subscriptions.value
      .filter((s) => s.is_active)
      .map((sub) => {
        // Ограничиваем плановый день количеством дней в месяце (например, 30 число в феврале -> 28/29)
        const effectiveDay = Math.min(sub.day_of_month, lastDayOfMonth);
        const daysUntil = effectiveDay - today;

        let statusLabel: string;
        let statusType: UpcomingSubscription["statusType"];

        if (daysUntil === 0) {
          statusLabel = "Сегодня";
          statusType = "today";
        } else if (daysUntil === 1) {
          statusLabel = "Завтра";
          statusType = "soon";
        } else if (daysUntil > 1 && daysUntil <= 3) {
          statusLabel = `Через ${daysUntil} дн.`;
          statusType = "soon";
        } else if (daysUntil > 3) {
          statusLabel = `${sub.day_of_month}-го числа`;
          statusType = "upcoming";
        } else {
          statusLabel = "Прошло";
          statusType = "past";
        }

        return {
          ...sub,
          daysUntil,
          statusLabel,
          statusType,
        };
      })
      .sort((a, b) => {
        // Сначала те, у которых списание сегодня или скоро (daysUntil >= 0)
        // Затем те, которые уже прошли в этом месяце
        const aUpcoming = a.daysUntil >= 0 ? 0 : 1;
        const bUpcoming = b.daysUntil >= 0 ? 0 : 1;

        if (aUpcoming !== bUpcoming) {
          return aUpcoming - bUpcoming;
        }

        return a.day_of_month - b.day_of_month;
      });
  });

  return {
    subscriptions,
    pending,
    error,
    fetchSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    totalMonthly,
    upcomingSubscriptions,
  };
};
