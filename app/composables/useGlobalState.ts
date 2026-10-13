/**
 * @module app/composables/useGlobalState
 * @fileoverview Глобальное состояние приложения (бюджет, категории, транзакции, лоадер)
 *
 * @description
 * Экспортирует простые хуки на основе `useState` из Nuxt, позволяющие
 * компонентам разделять общее реактивное состояние без сложных сторов.
 *
 * ### Доступные стейты:
 * - `useGlobalBudget`: Общий бюджет пользователя.
 * - `useGlobalCategories`: Кэшированный список категорий.
 * - `useGlobalLoading`: Глобальный индикатор загрузки.
 * - `useGlobalActiveSwipeId`: ID активного свайпа в списке транзакций.
 * - `useGlobalTransactionsVersion`: Глобальный счетчик версий транзакций для инвалидации.
 * - `useTransactionCache`: Кэш транзакций по ключам диапазонов дат.
 * - `useGlobalSplitGroups`: Кэшированный список групп совместных трат (Splitwise).
 * - `useGlobalSplitCurrentGroup`: Данные текущей открытой группы совместных трат.
 * - `useGlobalSplitIsLoaded`: Флаг первичной загрузки списка групп совместных трат.
 */
import type { Database } from "~/types/database.types";
import type { Transaction } from "./useTransactions";
import type { SplitGroupSummary, SplitGroupDetail } from "~/types/split";
import type { UserFriend } from "~/types/friends";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useGlobalBudget = () => useState<number>("budget", () => 0);

export const useGlobalCategories = () =>
  useState<Category[]>("categories", () => []);

export const useGlobalLoading = () =>
  useState<boolean>("globalLoading", () => false);

export const useGlobalActiveSwipeId = () =>
  useState<string | null>("activeSwipeId", () => null);

export const useGlobalTransactionsVersion = () =>
  useState<number>("txVersion", () => 0);

export const useTransactionCache = () =>
  useState<Record<string, Transaction[]>>("tx:queryCache", () => ({}));

export const useGlobalSplitGroups = () =>
  useState<SplitGroupSummary[]>("split:groups", () => []);

export const useGlobalSplitCurrentGroup = () =>
  useState<SplitGroupDetail | null>("split:currentGroup", () => null);

export const useGlobalFriends = () =>
  useState<UserFriend[]>("global_user_friends", () => []);
