/**
 * @module app/composables/usePwaInstall
 * @fileoverview Управление состоянием и установкой PWA на iOS, Android и десктопе
 * @description
 * Предоставляет хук для обнаружения платформы пользователя (iOS, Android),
 * перехвата нативного события `beforeinstallprompt` на Android и Chrome,
 * а также запуска диалога установки приложения в один клик.
 * ---
 * ### Логика работы:
 * 1. Перехват и сохранение отложенного события установки `beforeinstallprompt`.
 * 2. Реактивное определение окружения: iOS, Android, Standalone-режим, Telegram WebApp.
 * 3. Вызов нативной установки на Android через `installApp()`.
 * 4. Предоставление локализованных названий для UI («Установить на iPhone» / «Установить на Android»).
 */
import { computed } from "vue";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let hasInitialized = false;

export function usePwaInstall() {
  const deferredPrompt = useState<BeforeInstallPromptEvent | null>(
    "pwa:deferredPrompt",
    () => null,
  );
  const isInstallable = useState<boolean>("pwa:isInstallable", () => false);
  const isInstalled = useState<boolean>("pwa:isInstalled", () => false);
  const isIOS = useState<boolean>("pwa:isIOS", () => false);
  const isAndroid = useState<boolean>("pwa:isAndroid", () => false);
  const isStandalone = useState<boolean>("pwa:isStandalone", () => false);
  const isInTelegram = useState<boolean>("pwa:isInTelegram", () => false);

  const init = () => {
    if (!import.meta.client || hasInitialized) return;
    hasInitialized = true;

    const ua = navigator.userAgent;
    isIOS.value =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as { MSStream?: unknown }).MSStream;
    isAndroid.value = /Android/.test(ua);
    isInTelegram.value = !!window.Telegram?.WebApp?.initData;
    isStandalone.value =
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as { standalone?: boolean }).standalone;

    window.addEventListener("beforeinstallprompt", (e: Event) => {
      e.preventDefault();
      deferredPrompt.value = e as BeforeInstallPromptEvent;
      isInstallable.value = true;
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt.value = null;
      isInstallable.value = false;
      isInstalled.value = true;
    });
  };

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt.value) return false;
    try {
      await deferredPrompt.value.prompt();
      const choice = await deferredPrompt.value.userChoice;
      if (choice.outcome === "accepted") {
        isInstalled.value = true;
      }
      deferredPrompt.value = null;
      isInstallable.value = false;
      return choice.outcome === "accepted";
    } catch (err) {
      console.error("Ошибка при установке PWA:", err);
      return false;
    }
  };

  const platformTitle = computed(() => {
    if (isIOS.value) return "Установить на iPhone";
    if (isAndroid.value) return "Установить на Android";
    return "Установить приложение";
  });

  return {
    init,
    deferredPrompt,
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isStandalone,
    isInTelegram,
    platformTitle,
    installApp,
  };
}
