/**
 * @module app/types/split
 * @fileoverview Типы данных для модуля совместных трат (Splitwise)
 * @description
 * Определяет TypeScript-интерфейсы сущностей совместных трат: групп (`SplitGroupDetail`, `SplitGroupSummary`),
 * участников (`SplitMember`), расходов (`SplitExpense`, `SplitExpenseShare`), взаиморасчетов (`SplitSettlement`),
 * а также расчетных моделей балансов (`SplitMemberBalance`) и оптимизированных переводов (`SplitDebtTransfer`).
 */

export interface SplitMember {
  id: string;
  group_id: string;
  name: string;
  user_id: string | null;
  is_current_user: boolean;
  created_at: string;
  telegram_id?: number | null;
  photo_url?: string | null;
}

export interface SplitExpenseShare {
  id: string;
  expense_id: string;
  member_id: string;
  amount: number;
  share_value: number | null;
  memberName?: string;
}

export interface SplitExpenseShareInput {
  member_id: string;
  amount?: number | null;
  share_value?: number | null;
  is_fixed?: boolean;
}

export interface SplitExpensePayload {
  title: string;
  amount: number;
  payer_id: string;
  date?: string;
  split_type: "equal" | "exact" | "shares";
  shares: SplitExpenseShareInput[];
}

export interface SplitExpense {
  id: string;
  group_id: string;
  payer_id: string;
  amount: number;
  title: string;
  date: string;
  split_type: "equal" | "exact" | "shares";
  created_at: string;
  payerName?: string;
  shares: SplitExpenseShare[];
}

export interface SplitSettlement {
  id: string;
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  date: string;
  created_at: string;
  fromMemberName?: string;
  toMemberName?: string;
}

export interface SplitMemberBalance {
  memberId: string;
  memberName: string;
  isCurrentUser: boolean;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
  userId?: string | null;
  telegramId?: number | null;
  photoUrl?: string | null;
}

export interface SplitDebtTransfer {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  fromTelegramId?: number | null;
  toTelegramId?: number | null;
  fromPhotoUrl?: string | null;
  toPhotoUrl?: string | null;
}

export interface SplitGroupDetail {
  id: string;
  name: string;
  currency: string;
  user_id: string;
  created_at: string;
  members: SplitMember[];
  expenses: SplitExpense[];
  settlements: SplitSettlement[];
  balances: SplitMemberBalance[];
  optimizedDebts: SplitDebtTransfer[];
  userNetBalance: number;
  totalGroupSpending: number;
}

export interface SplitGroupSummary {
  id: string;
  name: string;
  currency: string;
  user_id: string;
  created_at: string;
  membersCount: number;
  totalExpenses: number;
  userNetBalance: number;
}
