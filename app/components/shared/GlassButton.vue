<script setup lang="ts">
/**
 * @module app/components/GlassButton
 * @fileoverview Базовая кнопка в стиле Glassmorphism
 * @description
 * Нативная кнопка с объёмными стеклянными тенями, поддерживающая несколько вариантов
 * (primary — акцентный градиент, soft — матовое стекло, outline — прозрачная)
 * и размеров (sm, default, lg, icon). Имеет тактильную отдачу (pressed state).
 */
import type { HTMLAttributes, ButtonHTMLAttributes } from "vue";
import { cn } from "~/utils/cn";

interface Props {
  class?: HTMLAttributes["class"];
  type?: ButtonHTMLAttributes["type"];
  variant?: "primary" | "soft" | "outline" | "glass-accent";
  size?: "sm" | "default" | "lg" | "icon";
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: "button",
  variant: "primary",
  size: "default",
  class: undefined,
  disabled: false,
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="
      cn(
        'transition-all duration-200 ease-out glass-pill cursor-pointer select-none inline-flex items-center justify-center font-medium',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none a11y-focus',
        // Основная (акцентный градиент + стеклянный объём)
        variant === 'primary' && [
          'text-white font-medium tracking-wide text-xs',
          'glass-glow',
          'active:scale-[0.97]',
        ],
        // Мягкая (матовое стекло)
        variant === 'soft' && [
          'glass-pill text-text-primary font-medium',
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
        size === 'sm' && 'h-11 px-4 rounded-pill text-base',
        size === 'icon' && 'size-12 rounded-pill',
        props.class,
      )
    "
  >
    <div
      v-if="variant === 'glass-accent'"
      class="glass-btn-accent-inner text-lg"
    >
      <slot />
    </div>
    <slot v-else />
  </button>
</template>
