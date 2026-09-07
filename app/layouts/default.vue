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
    class="max-w-md mx-auto relative min-h-screen bg-sunset-ambient shadow-2xl overflow-x-hidden"
  >
    <main class="pb-28">
      <slot />
    </main>
    <div
      class="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-50 pointer-events-none"
    >
      <nav
        class="relative h-16 bg-milky rounded-full shadow-neu-flat px-6 flex items-center justify-between pointer-events-auto"
      >
        <div class="flex items-center gap-5.5">
          <button
            class="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <UIcon name="i-heroicons-home" class="size-7" />
          </button>
          <button
            class="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <UIcon name="i-heroicons-chart-bar" class="size-7" />
          </button>
        </div>

        <!-- Центральная кнопка (Добавить) -->
        <div class="absolute left-1/2 -top-5 -translate-x-1/2">
          <button
            class="size-16 rounded-full neu-sunset-glow flex items-center justify-center text-white text-3xl font-light pb-0.5"
          >
            +
          </button>
        </div>

        <!-- Правый блок кнопок -->
        <div class="flex items-center gap-5.5">
          <button
            class="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <UIcon name="i-heroicons-bookmark" class="size-7" />
          </button>
          <button
            class="flex flex-col items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <UIcon name="i-heroicons-cog-8-tooth" class="size-7" />
          </button>
        </div>
      </nav>
    </div>
  </div>
</template>
