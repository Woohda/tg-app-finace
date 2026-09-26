<script setup lang="ts">
/**
 * @module app/components/GlassMorphButton
 * @fileoverview Кнопка с поддержкой состояний (idle, loading, success) и гласс-морфингом
 * @description
 * Кнопка, которая при загрузке сжимается в круг, а при успехе вспыхивает
 * белым светом (без использования зеленого цвета) с тактильным откликом.
 * Оптимизирована для плавных 60/120fps анимаций в Safari / iOS WebKit.
 */
import type { ButtonHTMLAttributes } from "vue";
import { watch } from "vue";
import { Check } from "@lucide/vue";
import { cn } from "~/utils/cn";
import { getHapticFeedback } from "~/utils/haptics";

interface Props {
  type?: ButtonHTMLAttributes["type"];
  state?: "idle" | "loading" | "success";
  disabled?: boolean;
  class?: string;
  variant?: "primary" | "delete";
}

const props = withDefaults(defineProps<Props>(), {
  type: "button",
  state: "idle",
  disabled: false,
  variant: "primary",
  class: undefined,
});

const haptic = getHapticFeedback();

watch(
  () => props.state,
  (newState) => {
    if (newState === "success") {
      haptic.impact("heavy");
      setTimeout(() => haptic.notification("success"), 100);
    }
  },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || state !== 'idle'"
    :class="
      cn(
        'morph-btn relative flex items-center justify-center rounded-full overflow-hidden',
        'outline-none a11y-focus select-none',
        'transition-[width,max-width,transform,background-color,box-shadow,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        // Размеры и форма
        state === 'idle'
          ? 'h-12 w-full max-w-full px-5 rounded-pill'
          : 'h-12 w-12 max-w-12 rounded-full mx-auto p-0',

        // Цвета (primary)
        variant === 'primary' &&
          state !== 'success' && [
            'glass-glow text-white font-medium border-none',
            'active:scale-[0.97]',
          ],

        // Цвета (delete)
        variant === 'delete' &&
          state !== 'success' && [
            'glass-glow text-white font-medium',
            'active:scale-[0.97]',
          ],

        // Состояние Успеха (всегда белое яркое свечение с микро-пружиной)
        state === 'success' && [
          'glass-milky text-text-accent scale-[1.04] shadow-glass',
        ],

        props.class,
      )
    "
  >
    <!-- Контент: Idle -->
    <Transition
      enter-active-class="transition duration-250 ease-out delay-150"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in absolute"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="state === 'idle'"
        class="flex items-center justify-center gap-2 whitespace-nowrap text-sm tracking-wide font-medium"
      >
        <slot />
      </div>
    </Transition>

    <!-- Контент: Loading -->
    <Transition
      enter-active-class="transition duration-250 ease-out delay-150"
      enter-from-class="opacity-0 scale-75"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in absolute"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-75"
    >
      <div
        v-if="state === 'loading'"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <Loader />
      </div>
    </Transition>

    <!-- Контент: Success -->
    <Transition
      enter-active-class="transition duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-100"
      enter-from-class="opacity-0 scale-50"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in absolute"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-50"
    >
      <div
        v-if="state === 'success'"
        class="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <slot name="success">
          <Check class="w-6 h-6 text-text-accent" :stroke-width="2.5" />
        </slot>
      </div>
    </Transition>
  </button>
</template>

<style scoped>
.morph-btn {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  isolation: isolate;
  will-change: width, max-width, transform;
}
</style>

