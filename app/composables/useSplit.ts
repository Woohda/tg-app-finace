/**
 * @module app/composables/useSplit
 * @fileoverview Управление совместными расходами и долгами (Splitwise)
 * @description
 * Обеспечивает реактивное взаимодействие с API для групп совместных трат:
 * создание групп, добавление участников, регистрацию расходов с различными типами сплита,
 * фиксацию выплат (settlements), рассылку Telegram-уведомлений и экспорт долей в FINO.
 * ---
 * ### Логика работы:
 * 1. Хранение глобального реактивного состояния групп (`split:groups`) и открытой группы (`split:currentGroup`).
 * 2. Получение списков групп и подробной информации через эндпоинты `/api/split/groups`.
 * 3. Создание групп, добавление и удаление участников.
 * 4. Запись расходов с типами деления `equal`, `exact` и `shares`.
 * 5. Фиксация взаиморасчетов между участниками и рассылка Telegram-уведомлений.
 * 6. Экспорт персональной доли затрат в личные финансы FINO.
 */
import { ref } from "vue";
import type {
  SplitGroupSummary,
  SplitGroupDetail,
  SplitMember,
  SplitExpense,
  SplitExpensePayload,
  SplitSettlement,
} from "~/types/split";
import { parseApiError } from "~/utils/api";

let inFlightGroupsFetch: Promise<SplitGroupSummary[]> | null = null;

export const useSplit = () => {
  const api = useApi();
  const toast = useAppToast();

  const groups = useGlobalSplitGroups();
  const currentGroup = useGlobalSplitCurrentGroup();
  const isLoaded = useState<boolean>("split:isLoaded", () => false);
  const pending = ref(false);
  const error = ref<string | null>(null);

  /**
   * Загрузка списка всех групп совместных трат
   */
  const fetchGroups = async (force = false) => {
    if (!force && isLoaded.value) {
      return groups.value;
    }
    if (inFlightGroupsFetch) {
      return inFlightGroupsFetch;
    }

    pending.value = true;
    error.value = null;

    inFlightGroupsFetch = (async () => {
      try {
        const data = await api<SplitGroupSummary[]>("/api/split/groups");
        groups.value = data;
        isLoaded.value = true;
        return data;
      } catch (e) {
        console.error("Ошибка загрузки групп совместных трат:", e);
        const msg = parseApiError(e, "Не удалось загрузить совместные траты");
        error.value = msg;
        toast.error(msg);
        return [];
      } finally {
        pending.value = false;
        inFlightGroupsFetch = null;
      }
    })();

    return inFlightGroupsFetch;
  };

  /**
   * Синхронизация сводки группы в общем списке groups
   */
  const syncGroupSummary = (detail: SplitGroupDetail) => {
    const idx = groups.value.findIndex((g) => g.id === detail.id);
    if (idx !== -1) {
      groups.value[idx] = {
        ...groups.value[idx]!,
        name: detail.name,
        currency: detail.currency,
        membersCount: detail.members.length,
        totalExpenses: detail.totalGroupSpending,
        userNetBalance: detail.userNetBalance,
      };
    }
  };

  /**
   * Загрузка полной информации о конкретной группе
   */
  const fetchGroup = async (id: string) => {
    pending.value = true;
    error.value = null;
    try {
      const data = await api<SplitGroupDetail>(`/api/split/groups/${id}`);
      currentGroup.value = data;
      syncGroupSummary(data);
      return data;
    } catch (e) {
      console.error("Ошибка загрузки группы:", e);
      const msg = parseApiError(e, "Не удалось загрузить группу");
      error.value = msg;
      toast.error(msg);
      return null;
    } finally {
      pending.value = false;
    }
  };

  /**
   * Создание новой группы совместных трат
   */
  const createGroup = async (
    name: string,
    initialMembers?: (string | { name: string; user_id?: string })[],
  ) => {
    error.value = null;
    try {
      const newGroup = await api<{ id: string; name: string }>(
        "/api/split/groups",
        {
          method: "POST",
          body: { name, initialMembers },
        },
      );
      toast.success(
        "Группа создана",
        `«${newGroup.name}» готова к добавлению трат`,
      );
      await fetchGroups(true);
      return newGroup;
    } catch (e) {
      console.error("Ошибка создания группы:", e);
      const msg = parseApiError(e, "Не удалось создать группу");
      error.value = msg;
      toast.error(msg);
      return null;
    }
  };

  /**
   * Удаление группы
   */
  const deleteGroup = async (id: string) => {
    error.value = null;
    try {
      await api(`/api/split/groups/${id}`, {
        method: "DELETE",
      });
      toast.success("Группа удалена");
      groups.value = groups.value.filter((g) => g.id !== id);
      if (currentGroup.value?.id === id) {
        currentGroup.value = null;
      }
      return true;
    } catch (e) {
      console.error("Ошибка удаления группы:", e);
      const msg = parseApiError(e, "Не удалось удалить группу");
      error.value = msg;
      toast.error(msg);
      return false;
    }
  };

  /**
   * Добавление участника в группу
   */
  const addMember = async (
    groupId: string,
    name: string,
    telegramUsername?: string,
    userId?: string,
  ) => {
    try {
      const member = await api<SplitMember>(
        `/api/split/groups/${groupId}/members`,
        {
          method: "POST",
          body: {
            name,
            telegram_username: telegramUsername || undefined,
            user_id: userId || undefined,
          },
        },
      );
      toast.success("Участник добавлен", member.name);
      await fetchGroup(groupId);
      return member;
    } catch (e) {
      console.error("Ошибка добавления участника:", e);
      toast.error(parseApiError(e, "Не удалось добавить участника"));
      return null;
    }
  };

  /**
   * Удаление участника из группы
   */
  const deleteMember = async (groupId: string, memberId: string) => {
    try {
      await api(`/api/split/groups/${groupId}/members/${memberId}`, {
        method: "DELETE",
      });
      toast.success("Участник удален");
      await fetchGroup(groupId);
      return true;
    } catch (e) {
      console.error("Ошибка удаления участника:", e);
      toast.error(parseApiError(e, "Не удалось удалить участника"));
      return false;
    }
  };

  /**
   * Добавление расхода
   */
  const addExpense = async (groupId: string, payload: SplitExpensePayload) => {
    try {
      const expense = await api<SplitExpense>(
        `/api/split/groups/${groupId}/expenses`,
        {
          method: "POST",
          body: payload,
        },
      );
      toast.success(
        "Расход добавлен",
        `${expense.title} (${expense.amount} ₽)`,
      );
      await fetchGroup(groupId);
      return expense;
    } catch (e) {
      console.error("Ошибка добавления расхода:", e);
      toast.error(parseApiError(e, "Не удалось добавить расход"));
      return null;
    }
  };

  /**
   * Удаление расхода
   */
  const deleteExpense = async (groupId: string, expenseId: string) => {
    try {
      await api(`/api/split/groups/${groupId}/expenses/${expenseId}`, {
        method: "DELETE",
      });
      toast.success("Расход удален");
      await fetchGroup(groupId);
      return true;
    } catch (e) {
      console.error("Ошибка удаления расхода:", e);
      toast.error(parseApiError(e, "Не удалось удалить расход"));
      return false;
    }
  };

  /**
   * Обновление существующего расхода
   */
  const updateExpense = async (
    groupId: string,
    expenseId: string,
    payload: SplitExpensePayload,
  ) => {
    try {
      const expense = await api<SplitExpense>(
        `/api/split/groups/${groupId}/expenses/${expenseId}`,
        {
          method: "PUT",
          body: payload,
        },
      );
      toast.success(
        "Расход обновлен",
        `${expense.title} (${expense.amount} ₽)`,
      );
      await fetchGroup(groupId);
      return expense;
    } catch (e) {
      console.error("Ошибка обновления расхода:", e);
      toast.error(parseApiError(e, "Не удалось обновить расход"));
      return null;
    }
  };

  /**
   * Фиксация возврата долга (расчета) между двумя участниками
   */
  const addSettlement = async (
    groupId: string,
    payload: {
      from_member_id: string;
      to_member_id: string;
      amount: number;
      date?: string;
    },
  ) => {
    try {
      const settlement = await api<SplitSettlement>(
        `/api/split/groups/${groupId}/settlements`,
        {
          method: "POST",
          body: payload,
        },
      );
      toast.success("Перевод зафиксирован", `Сумма: ${settlement.amount} ₽`);
      await fetchGroup(groupId);
      return settlement;
    } catch (e) {
      console.error("Ошибка сохранения перевода:", e);
      toast.error(parseApiError(e, "Не удалось зафиксировать перевод"));
      return null;
    }
  };

  /**
   * Отправка персональных Telegram-уведомлений должникам группы
   */
  const notifyDebtors = async (groupId: string) => {
    try {
      const result = await api<{
        success: boolean;
        notifiedCount: number;
        totalDebtsCount: number;
        message: string;
      }>(`/api/split/groups/${groupId}/notify-debtors`, {
        method: "POST",
      });

      if (result.notifiedCount > 0) {
        toast.success(
          "Уведомления отправлены",
          `Отправлено ${result.notifiedCount} должникам через @vfino_bot`,
        );
      } else {
        toast.info("Уведомления", result.message);
      }
      return result;
    } catch (e) {
      console.error("Ошибка отправки уведомлений:", e);
      toast.error(parseApiError(e, "Не удалось отправить уведомления"));
      return null;
    }
  };

  /**
   * Внесение доли текущего пользователя из сплита в личные расходы FINO
   */
  const exportShareToTransaction = async (
    groupId: string,
    expenseId: string,
    categoryId: string,
    title?: string,
  ) => {
    try {
      await api(
        `/api/split/groups/${groupId}/expenses/${expenseId}/to-transaction`,
        {
          method: "POST",
          body: {
            category_id: categoryId,
            ...(title?.trim() ? { title: title.trim() } : {}),
          },
        },
      );
      useTransactionCache().value = {};
      useGlobalTransactionsVersion().value++;

      toast.success(
        "Внесено в расходы",
        "Трата добавлена в ваши личные финансы",
      );
      return true;
    } catch (e) {
      console.error("Ошибка переноса доли в расходы:", e);
      toast.error(parseApiError(e, "Не удалось перенести долю в расходы"));
      return false;
    }
  };

  return {
    groups,
    currentGroup,
    pending,
    error,
    fetchGroups,
    fetchGroup,
    createGroup,
    deleteGroup,
    addMember,
    deleteMember,
    addExpense,
    updateExpense,
    deleteExpense,
    addSettlement,
    notifyDebtors,
    exportShareToTransaction,
  };
};
