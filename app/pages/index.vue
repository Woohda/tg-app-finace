<script setup lang="ts">
import { Home } from "@lucide/vue";

/**
 * @module app/pages/index
 * @fileoverview Главный экран (Dashboard)
 */
</script>

<template>
  <div class="pt-12 px-6 pb-20 flex flex-col gap-6 min-h-screen">
    <div class="flex flex-col items-center">
      <h1 class="text-text-primary text-2xl font-bold tracking-tight">
        Главная
      </h1>
      <p class="text-text-secondary text-sm">
        Здесь будет отображаться главная страница
      </p>
    </div>

    <NeuCard
      class="p-6 flex flex-col items-center justify-center gap-4 text-center mt-8"
    >
      <div
        class="size-16 rounded-full bg-milky shadow-neu-inner flex items-center justify-center text-sunset-mid"
      >
        <Home class="size-8" :stroke-width="1.75" />
      </div>
      <div class="space-y-1">
        <h2 class="text-text-primary font-bold text-lg">Раздел в разработке</h2>
      </div>
    </NeuCard>
  </div>
</template>
