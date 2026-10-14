/**
 * @module app/composables/useGlobalState
 * @fileoverview Глобальное состояние приложения (бюджет, категории, транзакции, лоадер)
 *
 * @description
 * Экспортирует простые хуки на основе `useState` из Nuxt, позволяющие
 * компонентам разделять общее реактивное состояние без сложных сторов.
 * Содержит единый метод `clearAllAppCaches` для сброса всех кэшей при смене пользователя (logout).
 *
 * ### Доступные стейты:
 * - `useGlobalBudget`: Общий бюджет пользователя.
 * - `useGlobalCategories`: Кэшированный список категорий.
 * - `useGlobalCategoriesIsLoaded`: Флаг загрузки списка категорий.
 * - `useGlobalLoading`: Глобальный индикатор загрузки.
 * - `useGlobalActiveSwipeId`: ID активного свайпа в списке транзакций.
 * - `useGlobalTransactionsVersion`: Глобальный счетчик версий транзакций для инвалидации.
 * - `useTransactionCache`: Кэш транзакций по ключам диапазонов дат.
 * - `useGlobalSplitGroups`: Кэшированный список групп совместных трат (Splitwise).
 * - `useGlobalSplitCurrentGroup`: Данные текущей открытой группы совместных трат.
 * - `useGlobalFriends`: Кэшированный список друзей пользователя.
 * - `clearAllAppCaches`: Сброс всех кэшей в дефолтное состояние.
 */
import type { Database } from "~/types/database.types";
import type { Transaction } from "./useTransactions";
import type { SplitGroupSummary, SplitGroupDetail } from "~/types/split";
import type { UserFriend } from "~/types/friends";
import type { Subscription } from "./useSubscriptions";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useGlobalBudget = () => useState<number>("budget", () => 0);

export const useGlobalCategories = () =>
  useState<Category[]>("categories", () => []);

export const useGlobalCategoriesIsLoaded = () =>
  useState<boolean>("categories:isLoaded", () => false);

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

/**
 * Единый сброс всех кэшей приложения при выходе из аккаунта (Logout).
 * Гарантирует изоляцию данных и предотвращает утечку состояния между пользователями.
 */
export const clearAllAppCaches = () => {
  // 1. Бюджет
  useState<number>("budget", () => 0).value = 0;
  useState<boolean>("budget:isLoaded", () => false).value = false;

  // 2. Категории
  useState<Category[]>("categories", () => []).value = [];
  useState<boolean>("categories:isLoaded", () => false).value = false;

  // 3. Транзакции
  useState<Record<string, Transaction[]>>("tx:queryCache", () => ({})).value =
    {};
  useState<number>("txVersion", () => 0).value = 0;

  // 4. Подписки
  useState<Subscription[]>("subscriptions:list", () => []).value = [];
  useState<boolean>("subscriptions:isLoaded", () => false).value = false;

  // 5. Цели по категориям
  useState<Record<string, number>>("category-goals:map", () => ({})).value = {};
  useState<boolean>("category-goals:isLoaded", () => false).value = false;

  // 6. Сплит
  useState<SplitGroupSummary[]>("split:groups", () => []).value = [];
  useState<SplitGroupDetail | null>("split:currentGroup", () => null).value =
    null;
  useState<boolean>("split:isLoaded", () => false).value = false;

  // 7. Друзья
  useState<UserFriend[]>("global_user_friends", () => []).value = [];
  useState<boolean>("global_user_friends_loaded", () => false).value = false;

  // 8. Локальные данные транзакций
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("app-known-tx-ids");
  }
};
