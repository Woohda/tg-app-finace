<script setup lang="ts">
import { BarChart3 } from "@lucide/vue";

/**
 * @module app/pages/analytics
 * @fileoverview Экран аналитики и отчетов
 */
</script>

<template>
  <div class="pt-12 px-6 pb-20 flex flex-col gap-6 min-h-screen">
    <div class="flex flex-col items-center">
      <h1 class="text-text-primary text-2xl font-bold tracking-tight">
        Аналитика
      </h1>
      <p class="text-text-secondary text-sm">Отчеты и графики расходов</p>
    </div>

    <NeuCard
      class="p-6 flex flex-col items-center justify-center gap-4 text-center mt-8"
    >
      <div
        class="size-16 rounded-full bg-milky shadow-neu-inner flex items-center justify-center text-sunset-mid"
      >
        <BarChart3 class="size-8" :stroke-width="1.75" />
      </div>
      <div class="space-y-1">
        <h2 class="text-text-primary font-bold text-lg">Раздел в разработке</h2>
        <p class="text-text-secondary text-sm">
          Скоро здесь появятся сводные графики по категориям, динамика трат и
          фильтры по периодам.
        </p>
      </div>
    </NeuCard>
  </div>
</template>
