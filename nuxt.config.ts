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
  app: {
    head: {
      script: [
        {
          src: "https://telegram.org/js/telegram-web-app.js",
          defer: true,
        },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  modules: ["@nuxt/eslint", "@nuxt/image", "@nuxt/ui", "@nuxtjs/supabase", "@nuxt/fonts"],
  fonts: {
    families: [
      { name: 'Inter', provider: 'google' }
    ]
  },
  components: [
    {
      path: '~/components',
      ignore: ['**/index.ts']
    }
  ],
  runtimeConfig: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    jwtSecret: process.env.JWT_SECRET,
    webAppUrl: process.env.WEB_APP_URL,
    devAppUrl: process.env.DEV_APP_URL,
  },
  supabase: {
    // Отключаем встроенный редирект на /login — авторизация через собственный JWT
    redirect: false,
  },
});
