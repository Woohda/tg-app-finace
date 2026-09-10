<script setup lang="ts">
/**
 * @module app/components/GlassButton
 * @fileoverview Базовая кнопка в стиле Glassmorphism
 * @description
 * Кнопка с объёмными стеклянными тенями, поддерживающая несколько вариантов
 * (primary — акцентный градиент, soft — матовое стекло, outline — прозрачная)
 * и размеров (sm, default, lg, icon). Имеет тактильную отдачу (pressed state).
 */
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
        'transition-all duration-200 ease-out',
        // Основная (акцентный градиент + стеклянный объём)
        variant === 'primary' && [
          'text-white font-medium tracking-wide text-xs',
          'glass-glow',
          'active:scale-[0.97]',
        ],
        // Мягкая (матовое стекло)
        variant === 'soft' && [
          'glass-milky text-text-primary font-medium',
          'active:scale-[0.97]',
        ],
        // Контурная (прозрачная с тонкой рамкой)
        variant === 'outline' && [
          'text-text-primary font-medium',
          'bg-white/20 backdrop-blur-lg',
          'border border-white/40',
          'active:scale-[0.97]',
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
