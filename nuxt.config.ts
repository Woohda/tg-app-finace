// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4,
  },
  nitro: {
    preset: "cloudflare-pages",
  },
  modules: ["@nuxt/eslint", "@nuxt/image", "@nuxt/ui", "@nuxtjs/supabase"],
  runtimeConfig: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    jwtSecret: process.env.JWT_SECRET,
  },
});
