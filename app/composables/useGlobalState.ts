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
 * - `useTransactionEntities`: Реестр сущностей транзакций по ID.
 */
import type { Database } from "~/types/database.types";
import type { Transaction } from "./useTransactions";

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

export const useTransactionEntities = () =>
  useState<Record<string, Transaction>>("tx:entities", () => ({}));
