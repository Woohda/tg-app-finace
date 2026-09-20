<script setup lang="ts">
/**
 * @module app/components/navbar/BottomNavItem
 * @fileoverview Элемент навигации для BottomNav.
 * @description
 * Рендерит иконку и подпись (label). Анимируется при активном состоянии (scale).
 */
import type { Component } from "vue";

defineProps<{
  to: string;
  icon: Component;
  label: string;
  isActive: boolean;
}>();
</script>

<template>
  <NuxtLink
    :to="to"
    class="relative flex flex-col items-center justify-center w-16 h-15 transition-all duration-300 rounded-3xl outline-none a11y-focus"
    :class="
      isActive
        ? 'text-text-accent'
        : 'text-text-secondary hover:text-text-primary'
    "
    :aria-label="label"
  >
    <!-- Активный фон (овал) -->
    <div
      v-if="isActive"
      class="absolute inset-0 glass-pill rounded-3xl -z-10"
    />

    <component
      :is="icon"
      class="size-5.5 mb-1"
      :stroke-width="isActive ? 2 : 1.5"
    />
    <span class="text-[9px] font-medium leading-none">{{ label }}</span>
  </NuxtLink>
</template>
