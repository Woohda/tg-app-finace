<script setup lang="ts">
/**
 * @module app/layouts/clean
 * @fileoverview Чистый layout без нижней панели навигации с поддержкой безопасных зон Telegram и Web
 * @description
 * Используется для модальных страниц или экранов сканирования чека.
 * Автоматически учитывает среду запуска (Telegram Mini App vs обычный Web/PWA):
 * в веб-версии добавляет безопасный отступ сверху (safe-area-inset-top + 1rem) для исключения
 * наложения контента на Dynamic Island и системный статус-бар iOS/Android.
 */
import { ref, computed, onMounted } from "vue";
import { usePwaInstall } from "~/composables/usePwaInstall";

const { init: initPwa, isIOS, isAndroid, isStandalone } = usePwaInstall();
const { initTelegramUser } = useAuth();

const isTelegram = ref(
  import.meta.server
    ? /telegram/i.test(useRequestHeaders(["user-agent"])["user-agent"] || "")
    : Boolean(window.Telegram?.WebApp?.initData) ||
      /telegram/i.test(navigator.userAgent || ""),
);

onMounted(() => {
  initPwa();
  initTelegramUser();
  isTelegram.value =
    Boolean(window.Telegram?.WebApp?.initData) ||
    /telegram/i.test(navigator.userAgent || "");
});

const mainStyle = computed(() => ({
  paddingTop: !isTelegram.value
    ? "calc(env(safe-area-inset-top, 0px) + 1rem)"
    : undefined,
  paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
}));
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
        :style="mainStyle"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
