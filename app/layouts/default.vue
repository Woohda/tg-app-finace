<script setup lang="ts">
/**
 * @module app/layouts/default
 * @fileoverview Базовый layout для всего приложения с нижним навигационным меню (Mobile-First).
 * @description
 * Обеспечивает отображение контента страниц и закрепленного нижнего меню.
 */
</script>

<template>
  <div class="mx-auto relative min-h-screen overflow-hidden">
    <main class="min-h-screen p-6 pb-25 bg-bg-milky">
      <slot />
    </main>
    <BottomNav />
  </div>
</template>
