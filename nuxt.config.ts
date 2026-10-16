// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: false,
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
      "/": {
        headers: {
          "Cache-Control": "no-cache, must-revalidate",
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
  experimental: {
    appManifest: false,
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
          innerHTML: `(function(){
            var createBanner = function(title, text, bg) {
              try {
                var el = document.createElement('div');
                el.style = 'position:fixed;top:0;left:0;right:0;z-index:99999999;background:' + (bg || '#dc2626') + ';color:#fff;padding:12px;font-size:11px;font-family:monospace;word-break:break-all;box-shadow:0 4px 12px rgba(0,0,0,0.5);max-height:50vh;overflow-y:auto;';
                el.innerHTML = '<strong>[' + title + ']</strong> ' + text;
                document.documentElement.appendChild(el);
              } catch(e) {}
            };
            window.addEventListener('error', function(e) {
              var target = e.target;
              if (target && target !== window && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                createBanner('RESOURCE FAILED', (target.src || target.href || target.tagName), '#dc2626');
                return;
              }
              var msg = e.message || (e.error ? e.error.message : String(e));
              var stack = e.error && e.error.stack ? '<br/><pre style="font-size:9px;margin:4px 0 0 0;white-space:pre-wrap;">' + e.error.stack + '</pre>' : '';
              createBanner('JS BOOT ERROR', msg + stack, '#dc2626');
              try {
                fetch('/api/bot/log-error', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ message: '[EARLY_BOOT_ERROR] ' + msg, stack: e.error ? e.error.stack : '', url: window.location.href, userId: 'EarlyBoot' })
                }).catch(function(){});
              } catch(err){}
            }, true);
            window.addEventListener('unhandledrejection', function(e) {
              var reason = e.reason ? (e.reason.message || String(e.reason)) : 'Unknown rejection';
              var stack = e.reason && e.reason.stack ? '<br/><pre style="font-size:9px;margin:4px 0 0 0;white-space:pre-wrap;">' + e.reason.stack + '</pre>' : '';
              createBanner('UNHANDLED PROMISE', reason + stack, '#ea580c');
              try {
                fetch('/api/bot/log-error', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ message: '[EARLY_UNHANDLED_PROMISE] ' + reason, stack: e.reason ? e.reason.stack : '', url: window.location.href, userId: 'EarlyBoot' })
                }).catch(function(){});
              } catch(err){}
            });
            window.addEventListener('securitypolicyviolation', function(e) {
              createBanner('CSP VIOLATION', (e.blockedURI || '') + ' (' + e.violatedDirective + ')', '#b91c1c');
            });
            setTimeout(function() {
              var root = document.getElementById('__nuxt');
              if (!root || !root.children.length) {
                var tg = window.Telegram && window.Telegram.WebApp;
                var info = 'URL: ' + window.location.pathname + ' | TG: ' + (tg ? 'OK' : 'NO') + ' | initData: ' + (tg && tg.initData ? 'YES' : 'NO');
                createBanner('BOOT TIMEOUT 6S', 'Vue не смонтировался за 6 сек. ' + info, '#7c2d12');
              }
            }, 6000);
          })();`,
        },
        {
          src: "/telegram-web-app.js",
        },
        {
          innerHTML:
            "try{if(window.Telegram&&window.Telegram.WebApp){window.Telegram.WebApp.ready();window.Telegram.WebApp.expand();}}catch(e){}",
        },
      ],
    },
  },
  css: ["~/assets/css/main.css"],
  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
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
});
