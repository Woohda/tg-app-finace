/**
 * @module server/utils/db
 * @fileoverview Утилиты базы данных Supabase и стандартные SQL-селекты
 * @description
 * Предоставляет синглтон-клиент Supabase для использования в фоновых задачах или Telegram-боте
 * (где недоступен контекст `H3Event`), фабрику клиентских инстансов от лица пользователя,
 * а также единые типизированные константы полей выборки для транзакций и регулярных платежей.
 * ---
 * ### Логика работы:
 * 1. `getBotSupabase`: Инициализирует и кеширует клиент Supabase с правами `service_role` (в обход RLS).
 * 2. `getUserSupabase`: Инициализирует клиент с публичным ключом и JWT токеном пользователя (с соблюдением RLS).
 * 3. `TRANSACTION_SELECT_FIELDS`: Единый строковый литерал полей выборки транзакций с джойном категорий.
 * 4. `SUBSCRIPTION_SELECT_FIELDS`: Единый строковый литерал полей выборки регулярных платежей с джойном категорий.
 *
 * ### Особенности:
 * - Все экспорты модуля автоматически импортируются в Nitro API без явных импортов.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getBotSupabase() {
  if (supabaseInstance) return supabaseInstance;

  // Пытаемся получить конфиг через Nuxt, либо напрямую из process.env
  let url = process.env.SUPABASE_URL;
  let key = process.env.NUXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY;

  try {
    const config = useRuntimeConfig();
    url = url || config.public?.supabase?.url;
    // Используем secretKey или serviceKey в зависимости от того, как они определены в nuxt.config
    type SupabaseConfig = { serviceKey?: string; secretKey?: string };
    key =
      key ||
      (config.supabase as SupabaseConfig)?.serviceKey ||
      (config.supabase as SupabaseConfig)?.secretKey;
  } catch {
    // Вне запроса useRuntimeConfig может выбросить ошибку
  }

  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials (SUPABASE_URL or NUXT_SUPABASE_SECRET_KEY)",
    );
  }

  supabaseInstance = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
    },
  });

  return supabaseInstance;
}

export function getUserSupabase(token: string) {
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_KEY;

  try {
    const config = useRuntimeConfig();
    url = url || config.public?.supabase?.url;
    key = key || config.public?.supabase?.key;
  } catch {
    // Вне запроса useRuntimeConfig может выбросить ошибку
  }

  if (!url || !key) {
    throw new Error("Missing Supabase URL or Anon Key");
  }

  return createClient<Database>(url as string, key as string, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export const TRANSACTION_SELECT_FIELDS = `
  id,
  amount,
  type,
  name,
  date,
  created_at,
  categories (
    id,
    name,
    icon
  )
` as const;

export const SUBSCRIPTION_SELECT_FIELDS = `
  id,
  name,
  amount,
  day_of_month,
  is_active,
  created_at,
  updated_at,
  category_id,
  categories (
    id,
    name,
    icon
  )
` as const;
