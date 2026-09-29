<script setup lang="ts">
/**
 * @module app/layouts/web
 * @fileoverview Выделенный layout для веб-версии приложения (Safari, Chrome, PWA на iOS и Android).
 * @description
 * Специализированная структура для работы вне Telegram Mini App:
 * - Увеличенный верхний отступ (safe-area-inset-top + 2.25rem), гарантирующий,
 *   что шапка, аватар и имя пользователя располагаются строго ниже Dynamic Island
 *   и системного статус-бара iOS/Android, полностью исключая наложение размытия.
 * - Увеличенный нижний отступ (safe-area-inset-bottom + 10rem), предотвращающий
 *   перекрытие последних карточек и списков плавающей нижней навигацией.
 */
import { onMounted } from "vue";
import { usePwaInstall } from "~/composables/usePwaInstall";

const { init: initPwa, isIOS, isAndroid, isStandalone } = usePwaInstall();
const { initTelegramUser } = useAuth();

onMounted(() => {
  initPwa();
  initTelegramUser();
});
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center sm:py-8 sm:bg-transparent"
    :data-platform="isIOS ? 'ios' : isAndroid ? 'android' : 'web'"
    :data-standalone="isStandalone ? 'true' : 'false'"
  >
    <div
      class="relative w-full max-w-97.5 h-dvh sm:h-211 overflow-hidden mx-auto sm:rounded-[45px] sm:shadow-[0_0_0_8px_rgba(255,255,255,0.4),0_25px_50px_-12px_rgba(0,0,0,0.5)] sm:border-[0.5px] border-white/50 bg-glass-ambient flex flex-col"
    >
      <main
        class="flex-1 overflow-y-auto p-5 relative z-10 scrollbar-hide"
        style="
          padding-top: calc(env(safe-area-inset-top, 0px) + 1rem);
          padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));
        "
      >
        <slot />
      </main>
      <BottomNav />
    </div>
  </div>
</template>
