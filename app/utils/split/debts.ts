/**
 * @module app/utils/split/debts
 * @fileoverview Алгоритмы расчета балансов и оптимизации долгов (Min Cash Flow)
 * @description
 * Предоставляет функции для:
 * - Расчета чистого сальдо каждого участника на основе расходов и возвратов долгов (`calculateMemberBalances`).
 * - Жадной оптимизации долговых обязательств к минимальному числу денежных переводов (`simplifyDebts`).
 */
import type {
  SplitMember,
  SplitExpense,
  SplitSettlement,
  SplitMemberBalance,
  SplitDebtTransfer,
} from "~/types/split";
import { roundCurrency } from "./shares";

/**
 * @function calculateMemberBalances
 * @fileoverview Расчет нетто-баланса каждого участника группы
 * @description
 * Агрегирует фактически оплаченные расходы, сумму причитающихся долей и осуществленные взаиморасчеты
 * для формирования итогового баланса (положительный — должны участнику, отрицательный — должен участник).
 */
export function calculateMemberBalances(
  members: SplitMember[],
  expenses: SplitExpense[],
  settlements: SplitSettlement[] = [],
): SplitMemberBalance[] {
  const memberMap = new Map<string, SplitMemberBalance>();

  for (const m of members) {
    memberMap.set(m.id, {
      memberId: m.id,
      memberName: m.name,
      isCurrentUser: m.is_current_user,
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
      userId: m.user_id,
      telegramId: m.telegram_id,
    });
  }

  // 1. Учитываем расходы (кто оплатил и кто сколько должен за них)
  for (const expense of expenses) {
    const payer = memberMap.get(expense.payer_id);
    if (payer) {
      payer.totalPaid = roundCurrency(payer.totalPaid + Number(expense.amount));
    }

    if (Array.isArray(expense.shares)) {
      for (const share of expense.shares) {
        const debtor = memberMap.get(share.member_id);
        if (debtor) {
          debtor.totalOwed = roundCurrency(
            debtor.totalOwed + Number(share.amount),
          );
        }
      }
    }
  }

  // 2. Учитываем совершенные выплаты (settlements)
  const settlementsPaid = new Map<string, number>();
  const settlementsReceived = new Map<string, number>();

  for (const set of settlements) {
    const amount = Number(set.amount);
    settlementsPaid.set(
      set.from_member_id,
      roundCurrency((settlementsPaid.get(set.from_member_id) || 0) + amount),
    );
    settlementsReceived.set(
      set.to_member_id,
      roundCurrency((settlementsReceived.get(set.to_member_id) || 0) + amount),
    );
  }

  // 3. Считаем итоговый чистый баланс (netBalance)
  for (const [id, balance] of memberMap.entries()) {
    const sent = settlementsPaid.get(id) || 0;
    const received = settlementsReceived.get(id) || 0;

    balance.netBalance = roundCurrency(
      balance.totalPaid - balance.totalOwed + sent - received,
    );
  }

  return Array.from(memberMap.values());
}

/**
 * @function simplifyDebts
 * @fileoverview Оптимизация задолженностей по алгоритму Min Cash Flow
 * @description
 * Жадным алгоритмом сводит цепочки взаимных долгов между участниками
 * к минимально возможному числу прямых денежных переводов.
 */
export function simplifyDebts(
  balances: SplitMemberBalance[],
): SplitDebtTransfer[] {
  interface ParticipantState {
    id: string;
    name: string;
    telegramId?: number | null;
    amount: number;
  }

  const debtors: ParticipantState[] = [];
  const creditors: ParticipantState[] = [];

  for (const b of balances) {
    const net = roundCurrency(b.netBalance);
    if (net < -0.009) {
      debtors.push({
        id: b.memberId,
        name: b.memberName,
        telegramId: b.telegramId,
        amount: roundCurrency(-net),
      });
    } else if (net > 0.009) {
      creditors.push({
        id: b.memberId,
        name: b.memberName,
        telegramId: b.telegramId,
        amount: roundCurrency(net),
      });
    }
  }

  const transfers: SplitDebtTransfer[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    // Сортируем по убыванию сумм для жадного сведения наибольших задолженностей
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debtor = debtors[0];
    const creditor = creditors[0];

    if (!debtor || !creditor) {
      break;
    }

    const transferAmount = roundCurrency(
      Math.min(debtor.amount, creditor.amount),
    );

    if (transferAmount > 0) {
      transfers.push({
        fromMemberId: debtor.id,
        fromMemberName: debtor.name,
        fromTelegramId: debtor.telegramId,
        toMemberId: creditor.id,
        toMemberName: creditor.name,
        toTelegramId: creditor.telegramId,
        amount: transferAmount,
      });
    }

    debtor.amount = roundCurrency(debtor.amount - transferAmount);
    creditor.amount = roundCurrency(creditor.amount - transferAmount);

    if (debtor.amount < 0.01) {
      debtors.shift();
    }
    if (creditor.amount < 0.01) {
      creditors.shift();
    }
  }

  return transfers;
}
