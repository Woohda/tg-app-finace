/**
 * @module server/utils/db
 * @fileoverview Утилиты для работы с базой данных вне контекста HTTP-запроса Nuxt.
 * @description
 * Предоставляет синглтон-клиент Supabase для использования в фоновых задачах или Telegram-боте,
 * где недоступен контекст `H3Event`.
 * ---
 * ### Логика работы:
 * 1. Пытается найти переменные окружения `SUPABASE_URL` и `SUPABASE_KEY`.
 * 2. `getBotSupabase`: Инициализирует и возвращает клиент Supabase с ключом `service_role`.
 * 3. `getUserSupabase`: Инициализирует и возвращает клиент Supabase с ключом `anon_key` и токеном пользователя. (полный доступ в обход RLS).
 * 3. Кеширует инстанс в `supabaseInstance`.
 * 
 * ### Особенности:
 * - Клиент обладает административными правами, использовать с осторожностью.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Возвращает Service Role клиент Supabase для использования внутри Telegram-бота (где нет H3Event).
 */
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
    key = key || (config.supabase as SupabaseConfig)?.serviceKey || (config.supabase as SupabaseConfig)?.secretKey;
  } catch {
    // Вне запроса useRuntimeConfig может выбросить ошибку
  }

  if (!url || !key) {
    throw new Error("Missing Supabase credentials (SUPABASE_URL or NUXT_SUPABASE_SECRET_KEY)");
  }

  supabaseInstance = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
    },
  });

  return supabaseInstance;
}

/**
 * Создает экземпляр клиента Supabase для запросов от лица конкретного пользователя.
 * Использует публичный anon_key и переданный JWT токен в заголовке Authorization.
 * Это позволяет Supabase RLS корректно идентифицировать пользователя.
 * 
 * @param {string} token JWT токен пользователя
 * @returns {SupabaseClient<Database>} Клиент Supabase для работы с БД от лица пользователя
 */
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

  return createClient<Database>(
    url as string,
    key as string,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );
}
