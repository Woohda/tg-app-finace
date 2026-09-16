/**
 * @module app/composables/useGlobalState
 * @fileoverview Глобальное состояние приложения (бюджет, категории, лоадер)
 * 
 * @description
 * Экспортирует простые хуки на основе `useState` из Nuxt, позволяющие 
 * компонентам разделять общее реактивное состояние без сложных сторов.
 * 
 * ### Доступные стейты:
 * - `useGlobalBudget`: Общий бюджет пользователя.
 * - `useGlobalCategories`: Кэшированный список категорий.
 * - `useGlobalLoading`: Глобальный индикатор загрузки.
 */
import type { Database } from "~/types/database.types";
type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useGlobalBudget = () => useState<number>("budget", () => 0);
export const useGlobalCategories = () => useState<Category[]>("categories", () => []);
export const useGlobalLoading = () => useState<boolean>("globalLoading", () => false);
