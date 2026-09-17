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
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "page", mode: "out-in" },
    head: {
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
        },
      ],
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
      pathPrefix: false,
      ignore: ['**/index.ts']
    }
  ],
  runtimeConfig: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    jwtSecret: process.env.JWT_SECRET,
    webAppUrl: process.env.WEB_APP_URL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiApiKey2: process.env.GEMINI_API_KEY2,
    adminTgId: process.env.ADMIN_TG_ID,
  },
  supabase: {
    // Отключаем встроенный редирект на /login — авторизация через собственный JWT
    redirect: false,
  },
});
