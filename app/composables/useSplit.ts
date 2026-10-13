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
import { ref, computed } from "vue";
import type {
  SplitGroupSummary,
  SplitGroupDetail,
  SplitMember,
  SplitExpense,
  SplitExpensePayload,
  SplitSettlement,
} from "~/types/split";
import { parseApiError } from "~/utils/api";

export const useSplit = () => {
  const api = useApi();
  const toast = useAppToast();

  const groups = useState<SplitGroupSummary[]>("split:groups", () => []);
  const currentGroup = useState<SplitGroupDetail | null>(
    "split:currentGroup",
    () => null,
  );
  const isLoaded = useState<boolean>("split:isLoaded", () => false);
  const isFetching = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const pending = computed(() => !isLoaded.value || isFetching.value);

  /**
   * Загрузка списка всех групп совместных трат
   */
  const fetchGroups = async (force = false) => {
    if (!force && isLoaded.value) {
      return groups.value;
    }

    isFetching.value = true;
    isLoading.value = true;
    error.value = null;
    try {
      const data = await api<SplitGroupSummary[]>("/api/split/groups");
      groups.value = data;
      return data;
    } catch (e) {
      console.error("Ошибка загрузки групп совместных трат:", e);
      const msg = parseApiError(e, "Не удалось загрузить совместные траты");
      error.value = msg;
      toast.error(msg);
      return [];
    } finally {
      isFetching.value = false;
      isLoading.value = false;
      isLoaded.value = true;
    }
  };

  /**
   * Загрузка полной информации о конкретной группе
   */
  const fetchGroup = async (id: string) => {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await api<SplitGroupDetail>(`/api/split/groups/${id}`);
      currentGroup.value = data;
      return data;
    } catch (e) {
      console.error("Ошибка загрузки группы:", e);
      const msg = parseApiError(e, "Не удалось загрузить группу");
      error.value = msg;
      toast.error(msg);
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Создание новой группы совместных трат
   */
  const createGroup = async (name: string, initialMembers?: string[]) => {
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Удаление группы
   */
  const deleteGroup = async (id: string) => {
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Добавление участника в группу
   */
  const addMember = async (
    groupId: string,
    name: string,
    telegramUsername?: string,
  ) => {
    isLoading.value = true;
    try {
      const member = await api<SplitMember>(
        `/api/split/groups/${groupId}/members`,
        {
          method: "POST",
          body: { name, telegram_username: telegramUsername },
        },
      );
      toast.success("Участник добавлен", member.name);
      await fetchGroup(groupId);
      return member;
    } catch (e) {
      console.error("Ошибка добавления участника:", e);
      toast.error(parseApiError(e, "Не удалось добавить участника"));
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Удаление участника из группы
   */
  const deleteMember = async (groupId: string, memberId: string) => {
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Добавление расхода
   */
  const addExpense = async (
    groupId: string,
    payload: SplitExpensePayload,
  ) => {
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Удаление расхода
   */
  const deleteExpense = async (groupId: string, expenseId: string) => {
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
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
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
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
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Отправка персональных Telegram-уведомлений должникам группы
   */
  const notifyDebtors = async (groupId: string) => {
    isLoading.value = true;
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
    } finally {
      isLoading.value = false;
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
    isLoading.value = true;
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
      toast.success(
        "Внесено в расходы",
        "Трата добавлена в ваши личные финансы",
      );
      return true;
    } catch (e) {
      console.error("Ошибка переноса доли в расходы:", e);
      toast.error(parseApiError(e, "Не удалось перенести долю в расходы"));
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    groups,
    currentGroup,
    pending,
    isFetching,
    isLoading,
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
