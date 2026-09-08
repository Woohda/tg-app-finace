<script setup lang="ts">
import { User } from "@lucide/vue";

/**
 * @module app/pages/settings
 * @fileoverview Экран настроек профиля и приложения
 */
const { user, logout } = useAuth();
</script>

<template>
  <div class="pt-12 px-6 pb-20 flex flex-col gap-6 min-h-screen">
    <div class="flex flex-col items-center">
      <h1 class="text-text-primary text-2xl font-bold tracking-tight">
        Настройки
      </h1>
      <p class="text-text-secondary text-sm">Профиль и параметры приложения</p>
    </div>

    <NeuCard
      class="p-6 flex flex-col items-center justify-center gap-4 text-center mt-4"
    >
      <div
        class="size-16 rounded-full bg-milky shadow-neu-inner flex items-center justify-center text-text-primary"
      >
        <User class="size-8" :stroke-width="1.75" />
      </div>
      <div class="space-y-1">
        <h2 class="text-text-primary font-bold text-lg">
          {{ user?.username ? `@${user.username}` : "Пользователь" }}
        </h2>
        <p class="text-text-secondary text-xs">
          ID: {{ user?.telegram_id ?? "Не авторизован" }}
        </p>
      </div>

      <NeuButton variant="soft" class="w-full mt-4" @click="logout">
        Выйти из аккаунта
      </NeuButton>
    </NeuCard>
  </div>
</template>
