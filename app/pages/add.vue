<script setup lang="ts">
import { Plus } from "@lucide/vue";

/**
 * @module app/pages/add
 * @fileoverview Экран добавления новой транзакции (доход / расход)
 */
</script>

<template>
  <div class="pt-12 px-6 pb-20 flex flex-col gap-6 min-h-screen">
    <div class="flex flex-col items-center">
      <h1 class="text-text-primary text-2xl font-bold tracking-tight">
        Новая операция
      </h1>
      <p class="text-text-secondary text-sm">Запись расхода или дохода</p>
    </div>

    <NeuCard
      class="p-6 flex flex-col items-center justify-center gap-4 text-center mt-8"
    >
      <div
        class="size-16 rounded-full bg-milky shadow-neu-inner flex items-center justify-center text-sunset-orange"
      >
        <Plus class="size-8" :stroke-width="2" />
      </div>
      <div class="space-y-1">
        <h2 class="text-text-primary font-bold text-lg">Раздел в разработке</h2>
        <p class="text-text-secondary text-sm">
          Здесь будет удобная форма ввода суммы, выбора категории и комментария
          к транзакции.
        </p>
      </div>
    </NeuCard>
  </div>
</template>
