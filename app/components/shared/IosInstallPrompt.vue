<script setup lang="ts">
/**
 * @module app/components/shared/IosInstallPrompt
 * @fileoverview Баннер-подсказка для установки PWA на экран «Домой» в Safari на iOS
 * @description
 * Отображается только для пользователей iPhone/iPad, открывших приложение в Safari
 * (вне Telegram Mini App и вне режима standalone PWA).
 */
import { ref, onMounted } from "vue";
import { X, Share, PlusSquare } from "@lucide/vue";

const isVisible = ref(false);

onMounted(() => {
  if (!import.meta.client) return;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !(window as any).MSStream;

  const isInTelegram = !!window.Telegram?.WebApp?.initData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isStandalone = !!(window.navigator as any).standalone;
  const isDismissed = localStorage.getItem("fino_ios_prompt_dismissed") === "1";

  // Показываем только в Safari на iOS, если не в Telegram, не в PWA и не закрыто ранее
  if (isIOS && !isInTelegram && !isStandalone && !isDismissed) {
    isVisible.value = true;
  }
});

const dismiss = () => {
  isVisible.value = false;
  if (import.meta.client) {
    localStorage.setItem("fino_ios_prompt_dismissed", "1");
  }
};
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-8"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-8"
  >
    <div
      v-if="isVisible"
      class="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto"
    >
      <GlassCard>
        <!-- Кнопка закрытия -->
        <GlassButton
          variant="soft"
          class="absolute top-3 right-3 h-6 px-1.25 text-text-primary shrink-0 shadow-xs"
          aria-label="Закрыть"
          @click="dismiss"
        >
          <X class="size-3" :stroke-width="1.5" />
        </GlassButton>

        <div class="flex items-center gap-3 mb-2">
          <div
            class="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-xl shrink-0"
          >
            📲
          </div>
          <div class="flex flex-col pr-6">
            <span class="text-text-primary font-bold text-sm leading-tight">
              Добавьте FINO на экран
            </span>
            <span class="text-text-secondary text-xs mt-0.5">
              Для работы без браузерных рамок
            </span>
          </div>
        </div>

        <div
          class="flex flex-col gap-2 pt-2 border-t border-black/10 text-xs text-text-primary"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex items-center justify-center size-5 rounded-full bg-black/5 shrink-0 text-[10px] font-bold"
              >1</span
            >
            <span>Нажмите кнопку <b>«Поделиться»</b></span>
            <Share class="size-3.5 text-blue-500 inline-block shrink-0" />
            <span class="text-text-secondary">внизу Safari</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="flex items-center justify-center size-5 rounded-full bg-black/5 shrink-0 text-[10px] font-bold"
              >2</span
            >
            <span>Выберите <b>«На экран "Домой"»</b></span>
            <PlusSquare
              class="size-3.5 text-text-primary inline-block shrink-0"
            />
          </div>
        </div>

        <GlassButton
          variant="soft"
          class="w-full rounded-2xl text-sm font-semibold text-text-primary transition-all mt-2 shadow-xs"
          @click="dismiss"
        >
          Понятно
        </GlassButton>
      </GlassCard>
    </div>
  </Transition>
</template>
