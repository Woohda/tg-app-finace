/**
 * @module app/utils/split/report
 * @fileoverview Формирование текстового отчета взаиморасчетов группы для Telegram
 * @description
 * Предоставляет функции для форматирования Markdown-сообщения со списком
 * необходимых переводов между участниками для отправки в групповые чаты Telegram.
 */
import type { SplitDebtTransfer } from "~/types/split";
import { formatAmount } from "~/utils/format";

/**
 * @function formatTelegramSplitReport
 * @fileoverview Формирование текстового отчета взаиморасчетов для Telegram
 * @description
 * Генерирует форматированное Markdown-сообщение с общими тратами группы и списком
 * необходимых переводов для копирования или отправки в групповой чат.
 */
export function formatTelegramSplitReport(
  groupName: string,
  transfers: SplitDebtTransfer[],
  totalSpending: number,
): string {
  if (transfers.length === 0) {
    return (
      `🎉 Все расчеты в группе «${groupName}» закрыты!\n` +
      `Общие расходы составили: ${formatAmount(totalSpending)}.\n` +
      `Никто никому ничего не должен.`
    );
  }

  const lines = transfers.map(
    (t, index) =>
      `${index + 1}. *${t.fromMemberName}* ➔ *${t.toMemberName}*: ${formatAmount(t.amount)}`,
  );

  return (
    `⚖️ *Расчет расходов по группе «${groupName}»*\n` +
    `💰 Всего потрачено: *${formatAmount(totalSpending)}*\n` +
    `⚡️ Оптимизированные переводы (${transfers.length}):\n` +
    lines.join("\n") +
    `\n_Рассчитано через FINO_ 🐶`
  );
}
