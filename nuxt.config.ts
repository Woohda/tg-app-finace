// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4,
  },
  nitro: {
    preset: "cloudflare-pages",
    routeRules: {
      "/_nuxt/**": {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
      "/_fonts/**": {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
      "/fonts/**": {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
      "/favicon.png": {
        headers: {
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
      "/apple-touch-icon.png": {
        headers: {
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
      "/telegram-web-app.js": {
        headers: {
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
      "/api/**": {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
      "/**": {
        headers: {
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "X-XSS-Protection": "1; mode=block",
          "Content-Security-Policy":
            "default-src 'self' data: blob: https://*.telegram.org https://t.me https://telegram.org; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://*.telegram.org https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.telegram.org https://t.me https://*.telesco.pe https://telesco.pe https://*.cdn-telegram.org https://*.supabase.co https://i.pravatar.cc; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.telegram.org https://cloudflareinsights.com https://generativelanguage.googleapis.com; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org;",
        },
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
               if (id.includes("@lucide/vue") || id.includes("lucide-vue-next")) {
                 return "vendor-icons";
               }
               if (id.includes("@supabase") || id.includes("supabase")) {
                 return "vendor-supabase";
               }
            }
          },
        },
      },
    },
  },
  app: {
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "page", mode: "out-in" },
    head: {
      title: "FINO — Финансы",
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content",
        },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "FINO" },
        { name: "theme-color", content: "#fdf4dc" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        {
          rel: "preload",
          href: "/fonts/Sansation-Regular.ttf",
          as: "font",
          type: "font/ttf",
          crossorigin: "",
        },
      ],
      script: [
        {
          src: "/telegram-web-app.js",
        },
        {
          innerHTML:
            '(function(){var t=setTimeout(function(){if(window.__FINO_MOUNTED__)return;if(document.getElementById("fino-stalled-banner"))return;var b=document.createElement("div");b.id="fino-stalled-banner";b.style.cssText="position:fixed;inset:0;background:#0f172a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,-apple-system,sans-serif;z-index:999999;";b.innerHTML=\'<div style="font-size:44px;margin-bottom:12px;">🐶</div><div style="font-size:18px;font-weight:600;margin-bottom:8px;">Медленный ответ сети</div><div style="font-size:13px;color:#94a3b8;line-height:1.5;max-width:280px;margin-bottom:24px;">Соединение с сервером нестабильно. Нажмите кнопку ниже для повторной попытки.</div><button onclick="window.location.reload(true)" style="background:#e11d48;color:#fff;border:none;padding:12px 28px;border-radius:99px;font-size:15px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;">Обновить страницу</button>\';document.body.appendChild(b);},5000);})();',
        },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxtjs/supabase",
  ],
  components: [
    {
      path: "~/components",
      pathPrefix: false,
      ignore: ["**/index.ts"],
    },
  ],
  runtimeConfig: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    jwtSecret: process.env.JWT_SECRET,
    webAppUrl: process.env.WEB_APP_URL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiApiKey2: process.env.GEMINI_API_KEY2,
    adminTgId: process.env.ADMIN_TG_ID,
    cronSecret: process.env.CRON_SECRET,
  },
  supabase: {
    // Отключаем встроенный редирект на /login — авторизация через собственный JWT
    redirect: false,
  },
});
