<script setup lang="ts">
/**
 * @module app/layouts/default
 * @fileoverview Базовый layout для всего приложения с нижним навигационным меню (Mobile-First).
 * @description
 * Обеспечивает отображение контента страниц и закрепленного нижнего меню.
 */
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center sm:py-8 sm:bg-transparent"
  >
    <div
      class="relative w-full max-w-97.5 h-dvh sm:h-211 overflow-hidden mx-auto sm:rounded-[45px] sm:shadow-[0_0_0_8px_rgba(255,255,255,0.4),0_25px_50px_-12px_rgba(0,0,0,0.5)] sm:border-[0.5px] border-white/50 bg-glass-milky flex flex-col"
    >
      <main
        class="flex-1 overflow-y-auto p-5 pb-25 relative z-10 scrollbar-hide"
      >
        <slot />
      </main>
      <BottomNav />
    </div>
  </div>
</template>
