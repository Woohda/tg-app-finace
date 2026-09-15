<script setup lang="ts">
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
    class="relative flex flex-col items-center justify-center w-16 h-15 transition-all duration-300 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-text-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
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
      class="absolute inset-0 bg-white/40 rounded-3xl shadow-[inset_0_2px_3px_rgba(255,255,255,0.8)] border border-white/50 -z-10"
    />

    <component
      :is="icon"
      class="size-5.5 mb-1"
      :stroke-width="isActive ? 2 : 1.5"
    />
    <span class="text-[9px] font-medium leading-none">{{ label }}</span>
  </NuxtLink>
</template>
