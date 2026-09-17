<script setup lang="ts">
/**
 * @module app/components/GlassMorphButton
 * @fileoverview Кнопка с поддержкой состояний (idle, loading, success) и гласс-морфингом
 * @description
 * Кнопка, которая при загрузке сжимается в круг, а при успехе вспыхивает
 * белым светом (без использования зеленого цвета) с тактильным откликом.
 */
import { watch } from "vue";
import { Check } from "@lucide/vue";
import { cn } from "~/utils";
import { useHaptic } from "~/utils/haptics";

interface Props {
  state?: "idle" | "loading" | "success";
  disabled?: boolean;
  class?: string;
  variant?: "primary" | "delete";
}

const props = withDefaults(defineProps<Props>(), {
  state: "idle",
  disabled: false,
  variant: "primary",
  class: undefined,
});

const haptic = useHaptic();

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
  <Button
    :disabled="disabled || state !== 'idle'"
    :class="
      cn(
        'relative flex items-center justify-center py-4 rounded-full overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'outline-none a11y-focus',
        // Размеры и форма
        state === 'idle'
          ? 'h-12 w-full px-5 rounded-pill'
          : 'h-12 w-12 rounded-full mx-auto',

        // Цвета (primary)
        variant === 'primary' &&
          state !== 'success' && [
            'glass-glow text-white font-medium',
            'active:scale-[0.97]',
          ],

        // Цвета (delete)
        variant === 'delete' &&
          state !== 'success' && [
            'glass-glow text-white font-medium',
            'active:scale-[0.97]',
          ],

        // Состояние Успеха (всегда белое яркое свечение)
        state === 'success' && ['glass-milky text-text-accent'],

        props.class,
      )
    "
  >
    <!-- Контент: Idle -->
    <Transition
      enter-active-class="transition duration-300 ease-out delay-200"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-300 ease-in absolute"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-4 scale-95"
    >
      <div
        v-if="state === 'idle'"
        class="flex items-center gap-2 whitespace-nowrap text-sm tracking-wide"
      >
        <slot />
      </div>
    </Transition>

    <!-- Контент: Loading -->
    <Transition
      enter-active-class="transition duration-300 ease-out delay-200"
      enter-from-class="opacity-0 scale-50 rotate-[-90deg]"
      enter-to-class="opacity-100 scale-100 rotate-0"
      leave-active-class="transition duration-300 ease-in absolute"
      leave-from-class="opacity-100 scale-100 rotate-0"
      leave-to-class="opacity-0 scale-50 rotate-[90deg]"
    >
      <div
        v-if="state === 'loading'"
        class="absolute inset-0 flex items-center justify-center"
      >
        <Loader />
      </div>
    </Transition>

    <!-- Контент: Success -->
    <Transition
      enter-active-class="transition duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-300"
      enter-from-class="opacity-0 scale-50"
      enter-to-class="opacity-100 scale-125"
      leave-active-class="transition duration-300 ease-in absolute"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-50"
    >
      <div
        v-if="state === 'success'"
        class="absolute inset-0 flex items-center justify-center"
      >
        <slot name="success">
          <Check class="w-8 h-8" :stroke-width="2" />
        </slot>
      </div>
    </Transition>
  </Button>
</template>
