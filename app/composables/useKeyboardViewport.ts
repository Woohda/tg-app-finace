/**
 * @module app/composables/useKeyboardViewport
 * @fileoverview Глобальное реактивное отслеживание виртуальной клавиатуры и видимой области экрана.
 * @description
 * Отслеживает изменения высоты экрана и появление клавиатуры через нативные события
 * Telegram WebApp (`viewportChanged`) и `window.visualViewport`.
 * Предоставляет стабильные реактивные значения `keyboardHeight` и `isKeyboardOpen`.
 */
import { ref, computed } from "vue";

const keyboardHeight = ref(0);
const isKeyboardOpen = ref(false);
let isInitialized = false;
let baseHeight = 0;

/**
 * Пересчитывает габариты видимой области и высоту клавиатуры.
 */
function updateDimensions() {
  if (typeof window === "undefined") return;

  const tg = window.Telegram?.WebApp;

  // 1. Приоритетный источник в Telegram Mini App: нативные параметры контейнера Telegram
  if (
    tg &&
    typeof tg.viewportStableHeight === "number" &&
    typeof tg.viewportHeight === "number"
  ) {
    const tgDiff = Math.max(0, tg.viewportStableHeight - tg.viewportHeight);
    if (tgDiff > 60) {
      keyboardHeight.value = tgDiff;
      isKeyboardOpen.value = true;
      return;
    } else {
      keyboardHeight.value = 0;
      isKeyboardOpen.value = false;
      return;
    }
  }

  // 2. Универсальный fallback для мобильного браузера: visualViewport
  if (window.visualViewport) {
    const currentVisualHeight = window.visualViewport.height;

    const isInputFocused =
      typeof document !== "undefined" &&
      (document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement);

    if (!isInputFocused && (!baseHeight || window.innerHeight > baseHeight)) {
      baseHeight = Math.max(window.innerHeight, currentVisualHeight);
    }

    const referenceHeight = baseHeight || window.innerHeight;
    const diff = Math.max(0, referenceHeight - currentVisualHeight);

    if (diff > 60) {
      keyboardHeight.value = diff;
      isKeyboardOpen.value = true;
    } else {
      keyboardHeight.value = 0;
      isKeyboardOpen.value = false;
      if (!isInputFocused) {
        baseHeight = Math.max(window.innerHeight, currentVisualHeight);
      }
    }
  }
}

/**
 * Предоставляет реактивные параметры высоты и состояния экранной клавиатуры.
 */
export function useKeyboardViewport() {
  if (import.meta.client && !isInitialized) {
    isInitialized = true;
    baseHeight = window.innerHeight;

    const tg = window.Telegram?.WebApp;
    if (tg?.onEvent) {
      tg.onEvent("viewportChanged", updateDimensions);
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateDimensions);
      window.visualViewport.addEventListener("scroll", updateDimensions);
    }
    window.addEventListener("resize", updateDimensions);
  }

  return {
    keyboardHeight: computed(() => keyboardHeight.value),
    isKeyboardOpen: computed(() => isKeyboardOpen.value),
  };
}
