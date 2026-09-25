/**
 * @module app/composables/useKeyboardViewport
 * @fileoverview Глобальное реактивное отслеживание виртуальной клавиатуры и видимой области экрана.
 * @description
 * Отслеживает изменения `window.visualViewport` при появлении/скрытии клавиатуры в Telegram Mini App.
 * Предоставляет реактивные значения `keyboardHeight` и `isKeyboardOpen`, позволяя модальным окнам
 * и формам ввода плавно подниматься над клавиатурой без рывков интерфейса.
 */
import { ref, computed } from "vue";

const keyboardHeight = ref(0);
const isKeyboardOpen = ref(false);
let isInitialized = false;

/**
 * Обработчик изменения размеров видимой области окна.
 */
function handleViewportChange() {
  if (typeof window === "undefined") return;

  if (window.visualViewport) {
    const visualHeight = window.visualViewport.height;
    const windowHeight = window.innerHeight;
    const diff = Math.max(0, windowHeight - visualHeight);

    // Порог 80px для надежного отсечения перестроений системных баров
    if (diff > 80) {
      keyboardHeight.value = diff;
      isKeyboardOpen.value = true;
    } else {
      keyboardHeight.value = 0;
      isKeyboardOpen.value = false;
    }
  }
}

/**
 * Предоставляет реактивные параметры высоты и состояния экранной клавиатуры.
 */
export function useKeyboardViewport() {
  if (import.meta.client && !isInitialized) {
    isInitialized = true;
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }
    window.addEventListener("resize", handleViewportChange);
  }

  return {
    keyboardHeight: computed(() => keyboardHeight.value),
    isKeyboardOpen: computed(() => isKeyboardOpen.value),
  };
}
