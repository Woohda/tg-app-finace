/**
 * @module server/utils/splitNotification
 * @fileoverview Управление и синхронизация времени напоминаний должникам о переводах
 * @description
 * Обеспечивает разделяемое состояние времени отправки напоминаний должникам между
 * API получения группы ([id].get) и API рассылки уведомлений (notify-debtors.post).
 * Гарантирует корректный расчет 24-часового лимита даже в случае, если колонка
 * `last_notified_at` еще не мигрирована в таблице `split_groups` в базе данных Supabase.
 */

export const splitGroupNotificationTimes = new Map<string, number>();

export const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // Раз в сутки (24 часа)

/**
 * Получение эффективной отметки времени последнего напоминания (БД или память сервера)
 */
export const getSplitGroupLastNotifiedAt = (
  groupId: string,
  dbTime?: string | null,
): string | null => {
  const dbMs = dbTime ? new Date(dbTime).getTime() : 0;
  const memMs = splitGroupNotificationTimes.get(groupId) || 0;
  const effectiveMs = Math.max(dbMs, memMs);
  return effectiveMs > 0 ? new Date(effectiveMs).toISOString() : null;
};

/**
 * Фиксация времени последнего напоминания
 */
export const recordSplitGroupNotification = (
  groupId: string,
  timeMs: number = Date.now(),
) => {
  splitGroupNotificationTimes.set(groupId, timeMs);
};

/**
 * Проверка, находится ли отправка уведомлений в периоде кулдауна (24 часа)
 */
export const getSplitGroupNotificationCooldown = (
  groupId: string,
  dbTime?: string | null,
): {
  isCooldown: boolean;
  remainingHours: number;
  effectiveLastNotifiedMs: number;
} => {
  const dbMs = dbTime ? new Date(dbTime).getTime() : 0;
  const memMs = splitGroupNotificationTimes.get(groupId) || 0;
  const effectiveLastNotifiedMs = Math.max(dbMs, memMs);
  const now = Date.now();

  if (
    effectiveLastNotifiedMs > 0 &&
    now - effectiveLastNotifiedMs < NOTIFICATION_COOLDOWN_MS
  ) {
    const remainingMs =
      NOTIFICATION_COOLDOWN_MS - (now - effectiveLastNotifiedMs);
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    return {
      isCooldown: true,
      remainingHours,
      effectiveLastNotifiedMs,
    };
  }

  return {
    isCooldown: false,
    remainingHours: 0,
    effectiveLastNotifiedMs,
  };
};
