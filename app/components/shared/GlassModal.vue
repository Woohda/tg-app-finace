<script setup lang="ts">
/**
 * @module app/components/modal/GlassModal
 * @fileoverview Базовый переиспользуемый UI-компонент модального окна в стиле Glassmorphism.
 * @description
 * Предоставляет обертку для других модальных окон (например, `TransactionModal`).
 * Поддерживает анимации появления/скрытия (Transition) и разные позиции (`center` / `bottom`).
 * ---
 * ### Логика работы:
 * 1. Использует Teleport в `body` для обхода проблем с `z-index` в CSS.
 * 2. Блокирует прокрутку страницы (`document.body.style.overflow = "hidden"`) при открытии.
 */
import { computed, watch, onUnmounted } from "vue";
import { cn } from "~/utils/cn";
import { X } from "@lucide/vue";

interface Props {
  isOpen?: boolean;
  title?: string;
  position?: "center" | "bottom";
  showClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  title: undefined,
  position: "center",
  showClose: true,
});

const emit = defineEmits<{
  (e: "close"): void;
}>();

const close = () => {
  emit("close");
};

const { keyboardHeight, isKeyboardOpen } = useKeyboardViewport();

// Динамические стили контейнера и карточки для безопасного расположения над клавиатурой
const containerStyle = computed(() => {
  if (!isKeyboardOpen.value || keyboardHeight.value <= 0) return undefined;
  return {
    paddingBottom: `${keyboardHeight.value + 20}px`,
  };
});

const cardStyle = computed(() => {
  if (!isKeyboardOpen.value || keyboardHeight.value <= 0) return undefined;
  return {
    maxHeight: `calc(100dvh - ${keyboardHeight.value + 44}px)`,
  };
});

// Управление блокировкой прокрутки фона и вертикальных свайпов Telegram
watch(
  () => props.isOpen,
  (open) => {
    if (typeof document === "undefined") return;
    if (open) {
      document.body.style.overflow = "hidden";
      window.Telegram?.WebApp?.disableVerticalSwipes?.();
    } else {
      document.body.style.overflow = "";
      window.Telegram?.WebApp?.enableVerticalSwipes?.();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
    window.Telegram?.WebApp?.enableVerticalSwipes?.();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        :class="
          cn(
            'fixed inset-0 z-60 flex p-4 bg-black/10 backdrop-blur-sm transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            position === 'bottom'
              ? 'items-end justify-center sm:items-center'
              : 'items-center justify-center',
          )
        "
        :style="containerStyle"
        @click.self="close"
      >
        <GlassCard
          data-modal-card="true"
          :class="
            cn(
              'w-full max-w-90 mb-2 p-5 flex flex-col gap-4 glass-milky transition-[max-height,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
              'max-h-[85dvh] overflow-y-auto scrollbar-hide',
              position === 'bottom'
                ? 'animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]'
                : 'animate-in zoom-in-95 duration-250',
            )
          "
          :style="cardStyle"
        >
          <div
            v-if="title || showClose || $slots.header"
            class="flex justify-between items-center"
          >
            <slot name="header">
              <h2 v-if="title" class="text-text-primary text-xl font-bold">
                {{ title }}
              </h2>
              <div v-else class="flex-1" />
            </slot>

            <GlassButton
              v-if="showClose"
              variant="soft"
              size="sm"
              class="px-2.25 text-text-primary shrink-0"
              @click="close"
            >
              <X :stroke-width="1.5" />
            </GlassButton>
          </div>
          <slot />
        </GlassCard>
      </div>
    </Transition>
  </Teleport>
</template>
