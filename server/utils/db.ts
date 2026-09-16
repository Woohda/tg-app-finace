/**
 * @module server/utils/db
 * @fileoverview Утилиты для работы с базой данных вне контекста HTTP-запроса Nuxt.
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
