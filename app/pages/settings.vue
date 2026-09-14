<script setup lang="ts">
import { computed } from "vue";
import { User } from "@lucide/vue";

/**
 * @module app/pages/settings
 * @fileoverview Экран настроек профиля и приложения
 */
const { user, tgUser, logout } = useAuth();

const userName = computed(() => {
  if (tgUser.value?.first_name) {
    return tgUser.value.first_name;
  }
  if (user.value?.username) {
    return `@${user.value.username}`;
  }
  return "Пользователь";
});

const avatarUrl = computed(() => tgUser.value?.photo_url || null);
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col items-center">
      <h1 class="text-text-primary text-2xl font-bold tracking-tight">
        Настройки
      </h1>
      <p class="text-text-secondary text-sm">Профиль и параметры приложения</p>
    </div>

    <GlassCard
      class="p-6 flex flex-col items-center justify-center gap-3 text-center"
    >
      <div class="w-full flex gap-3 items-center justify-start">
        <div
          class="size-16 rounded-full glass-milky shadow-glass-inner flex items-center justify-center text-text-primary overflow-hidden"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            alt="Avatar"
            class="w-full h-full object-cover"
          />
          <User v-else class="size-8" :stroke-width="1.75" />
        </div>
        <div class="flex flex-col gap-0.5 items-start">
          <h2 class="text-text-primary font-bold text-lg">
            {{ userName }}
          </h2>
          <p class="text-text-secondary text-xs">
            ID: {{ user?.telegram_id ?? "Не авторизован" }}
          </p>
        </div>
      </div>

      <GlassButton variant="soft" class="w-full mt-4" @click="logout">
        Выйти из аккаунта
      </GlassButton>
    </GlassCard>
  </div>
</template>
