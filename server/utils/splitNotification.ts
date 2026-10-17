/**
 * @module server/utils/splitNotification
 * @fileoverview Управление и синхронизация времени персональных напоминаний должникам
 * @description
 * Обеспечивает разделяемый расчет 24-часового периода кулдауна для персональных
 * напоминаний должникам о возврате долга в Telegram. Кулдаун рассчитывается строго
 * для конкретной пары (группа + должник + получатель перевода).
 * ---
 * ### Логика работы:
 * 1. Формирование уникального ключа `${groupId}:${fromMemberId}:${toMemberId}`.
 * 2. Проверка, не отправлялось ли напоминание менее 24 часов назад.
 * 3. Фиксация времени успешной отправки в памяти сервера.
 */

const splitDebtorNotificationTimes = new Map<string, number>();

const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 часа

const getDebtorKey = (
  groupId: string,
  fromMemberId: string,
  toMemberId?: string | null,
): string => {
  return toMemberId
    ? `${groupId}:${fromMemberId}:${toMemberId}`
    : `${groupId}:${fromMemberId}`;
};

/**
 * Фиксация времени отправки персонального напоминания должнику
 */
export const recordSplitDebtorNotification = (
  groupId: string,
  fromMemberId: string,
  toMemberId?: string | null,
  timeMs: number = Date.now(),
) => {
  splitDebtorNotificationTimes.set(
    getDebtorKey(groupId, fromMemberId, toMemberId),
    timeMs,
  );
};

/**
 * Проверка, находится ли отправка напоминания конкретному должнику в периоде кулдауна (24 часа)
 */
export const getSplitDebtorNotificationCooldown = (
  groupId: string,
  fromMemberId: string,
  toMemberId?: string | null,
): {
  isCooldown: boolean;
  remainingHours: number;
  remainingMinutes: number;
} => {
  const key = getDebtorKey(groupId, fromMemberId, toMemberId);
  const lastNotifiedMs = splitDebtorNotificationTimes.get(key) || 0;
  const now = Date.now();

  if (lastNotifiedMs > 0 && now - lastNotifiedMs < NOTIFICATION_COOLDOWN_MS) {
    const remainingMs = NOTIFICATION_COOLDOWN_MS - (now - lastNotifiedMs);
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    return {
      isCooldown: true,
      remainingHours,
      remainingMinutes,
    };
  }

  return {
    isCooldown: false,
    remainingHours: 0,
    remainingMinutes: 0,
  };
};
