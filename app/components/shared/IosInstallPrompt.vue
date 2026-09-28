<script setup lang="ts">
/**
 * @module app/components/shared/IosInstallPrompt
 * @fileoverview Баннер-подсказка для установки PWA на экран «Домой» (iOS Safari и Android Chrome)
 * @description
 * Отображается только для пользователей мобильных устройств, открывших веб-версию в браузере
 * (вне Telegram Mini App и вне режима standalone PWA).
 * Автоматически адаптирует интерфейс:
 * - На Android: кнопка нативной установки в 1 клик (beforeinstallprompt) или инструкция для меню Chrome.
 * - На iOS: пошаговая подсказка Safari («Поделиться» ➔ «На экран "Домой"»).
 */
import { ref, onMounted } from "vue";
import { X, Share, PlusSquare, Download, MoreVertical } from "@lucide/vue";
import { usePwaInstall } from "~/composables/usePwaInstall";

const {
  init,
  isIOS,
  isAndroid,
  isStandalone,
  isInTelegram,
  isInstallable,
  installApp,
} = usePwaInstall();

const isVisible = ref(false);
const isInstalling = ref(false);

onMounted(() => {
  if (!import.meta.client) return;
  init();

  const isDismissed =
    localStorage.getItem("fino_pwa_prompt_dismissed") === "1" ||
    localStorage.getItem("fino_ios_prompt_dismissed") === "1";

  // Показываем на iOS или Android в браузере (не в Telegram и не в standalone)
  if (
    (isIOS.value || isAndroid.value) &&
    !isInTelegram.value &&
    !isStandalone.value &&
    !isDismissed
  ) {
    isVisible.value = true;
  }
});

const dismiss = () => {
  isVisible.value = false;
  if (import.meta.client) {
    localStorage.setItem("fino_pwa_prompt_dismissed", "1");
  }
};

const handleAndroidInstall = async () => {
  isInstalling.value = true;
  try {
    const success = await installApp();
    if (success) {
      dismiss();
    }
  } finally {
    isInstalling.value = false;
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
              {{ isAndroid ? "Установите FINO на телефон" : "Добавьте FINO на экран" }}
            </span>
            <span class="text-text-secondary text-xs mt-0.5">
              Для быстрого запуска без рамок браузера
            </span>
          </div>
        </div>

        <!-- 1. Вариант для iOS (Safari) -->
        <div
          v-if="isIOS"
          class="flex flex-col gap-2 pt-2 border-t border-black/10 text-xs text-text-primary"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex items-center justify-center size-5 rounded-full bg-black/5 shrink-0 text-[10px] font-bold"
            >
              1
            </span>
            <span>Нажмите кнопку <b>«Поделиться»</b></span>
            <Share class="size-3.5 text-blue-500 inline-block shrink-0" />
            <span class="text-text-secondary">внизу Safari</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="flex items-center justify-center size-5 rounded-full bg-black/5 shrink-0 text-[10px] font-bold"
            >
              2
            </span>
            <span>Выберите <b>«На экран "Домой"»</b></span>
            <PlusSquare
              class="size-3.5 text-text-primary inline-block shrink-0"
            />
          </div>

          <GlassButton
            variant="soft"
            class="w-full rounded-2xl text-sm font-semibold text-text-primary transition-all mt-2 shadow-xs"
            @click="dismiss"
          >
            Понятно
          </GlassButton>
        </div>

        <!-- 2. Вариант для Android с поддержкой прямого клика установки -->
        <div
          v-else-if="isAndroid && isInstallable"
          class="flex flex-col gap-2 pt-2 border-t border-black/10 text-xs text-text-primary"
        >
          <GlassButton
            variant="primary"
            class="w-full rounded-2xl text-sm font-semibold transition-all mt-1 shadow-xs flex items-center justify-center gap-2"
            :disabled="isInstalling"
            @click="handleAndroidInstall"
          >
            <Download class="size-4" />
            {{ isInstalling ? "Установка..." : "Установить приложение" }}
          </GlassButton>
          <button
            type="button"
            class="text-xs text-text-secondary hover:text-text-primary text-center py-1 mt-0.5"
            @click="dismiss"
          >
            Не сейчас
          </button>
        </div>

        <!-- 3. Вариант для Android при ручной установке через меню Chrome -->
        <div
          v-else
          class="flex flex-col gap-2 pt-2 border-t border-black/10 text-xs text-text-primary"
        >
          <div class="flex items-center gap-2">
            <span
              class="flex items-center justify-center size-5 rounded-full bg-black/5 shrink-0 text-[10px] font-bold"
            >
              1
            </span>
            <span>Нажмите меню <b>⋮</b></span>
            <MoreVertical class="size-3.5 text-text-primary inline-block shrink-0" />
            <span class="text-text-secondary">в браузере</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="flex items-center justify-center size-5 rounded-full bg-black/5 shrink-0 text-[10px] font-bold"
            >
              2
            </span>
            <span>Выберите <b>«Установить приложение»</b></span>
            <Download class="size-3.5 text-text-primary inline-block shrink-0" />
          </div>

          <GlassButton
            variant="soft"
            class="w-full rounded-2xl text-sm font-semibold text-text-primary transition-all mt-2 shadow-xs"
            @click="dismiss"
          >
            Понятно
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  </Transition>
</template>
