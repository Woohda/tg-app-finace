<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils";

interface Props {
  class?: HTMLAttributes["class"];
  variant?: "primary" | "soft" | "outline";
  size?: "sm" | "default" | "lg" | "icon";
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "default",
  class: undefined,
});
</script>

<template>
  <UiButton
    :disabled="disabled"
    :class="
      cn(
        'transition-all duration-200 ease-out active:scale-[0.97]',
        // Основная (Sunset Glow + неоморфный глянец)
        variant === 'primary' && [
          'text-white font-medium tracking-wide text-xs',
          'border-[0.5px] border-white/25',
          'neu-sunset-glow',
        ],
        // Мягкая (чистый неоморфизм)
        variant === 'soft' && [
          'bg-milky text-text-primary font-medium',
          'border-[0.5px] border-white/50 border-b-transparent border-r-transparent',
          'shadow-neu-flat',
          'hover:shadow-neu-flat-hover',
          'active:shadow-neu-pressed active:scale-[0.98]',
        ],
        // Контурная (чистый неоморфизм — идентична мягкой)
        variant === 'outline' && [
          'bg-milky text-text-primary font-medium',
          'border-[0.5px] border-white/50 border-b-transparent border-r-transparent',
          'shadow-neu-flat',
          'hover:shadow-neu-flat-hover',
          'active:shadow-neu-pressed active:scale-[0.98]',
        ],
        // Размеры (Mobile First — приоритет мобильных)
        size === 'default' && 'h-12 px-6 rounded-pill text-base',
        size === 'lg' && 'h-14 px-8 rounded-pill text-lg font-semibold',
        size === 'sm' && 'h-10 px-4 rounded-pill text-sm',
        size === 'icon' && 'size-12 rounded-pill',
        props.class,
      )
    "
  >
    <slot />
  </UiButton>
</template>
