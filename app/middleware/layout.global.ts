/**
 * @module app/middleware/layout.global
 * @fileoverview Динамическое переключение layout в зависимости от среды запуска (Telegram Mini App vs Web).
 * @description
 * Если приложение открыто в обычном браузере или в виде установленного PWA
 * (Safari / Chrome на iPhone, Android, десктоп), автоматически активируется layout `web`
 * с расширенными безопасными зонами.
 * Если приложение запущено внутри Telegram Mini App, сохраняется `default`.
 */
export default defineNuxtRouteMiddleware((to) => {
  // Не переопределяем страницы с явно заданным кастомным layout (например, /login с layout: false или /scan с clean)
  if (to.meta.layout === false || to.meta.layout === "clean") {
    return;
  }

  const isTelegram = import.meta.server
    ? /telegram/i.test(useRequestHeaders(["user-agent"])["user-agent"] || "")
    : Boolean(window.Telegram?.WebApp?.initData) ||
      /telegram/i.test(navigator.userAgent || "");

  setPageLayout(isTelegram ? "default" : "web");
});
