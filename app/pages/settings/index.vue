<script setup lang="ts">
import { computed } from "vue";

/**
 * @module app/pages/settings
 * @fileoverview Экран настроек профиля и приложения
 * @description
 * Отображает профиль Telegram, позволяет выйти из аккаунта и предоставляет
 * навигацию к управлению бюджетом и категориями.
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
    <div class="flex items-center justify-center gap-3">
      <div class="flex flex-col text-center">
        <h1 class="text-text-primary text-xl font-bold tracking-tight">
          Настройки
        </h1>
        <p class="text-text-secondary text-xs">
          Профиль и параметры приложения
        </p>
      </div>
    </div>

    <GlassCard
      class="p-5 flex flex-col items-center justify-center gap-3 text-center"
    >
      <div class="w-full flex gap-3 items-center justify-start">
        <Avatar :src="avatarUrl" size="lg" />
        <div class="flex flex-col gap-0.5 items-start">
          <h2 class="text-text-primary font-bold text-lg">
            {{ userName }}
          </h2>
          <p class="text-text-secondary text-xs">
            ID: {{ user?.telegram_id ?? "Не авторизован" }}
          </p>
        </div>
      </div>
    </GlassCard>

    <div class="flex flex-col gap-3">
      <NuxtLink to="/categories" class="block">
        <GlassCard
          class="p-5 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-full glass-milky flex items-center justify-center text-text-primary"
            >
              <span class="text-xl">📁</span>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-text-primary font-bold text-base"
                >Мои категории</span
              >
              <span class="text-text-secondary text-xs"
                >Добавление и редактирование</span
              >
            </div>
          </div>
          <div class="text-text-secondary">›</div>
        </GlassCard>
      </NuxtLink>

      <NuxtLink to="/budget" class="block">
        <GlassCard
          class="p-5 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div
              class="size-10 rounded-full glass-milky flex items-center justify-center text-text-primary"
            >
              <span class="text-xl">🎯</span>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-text-primary font-bold text-base"
                >Бюджет и цели</span
              >
              <span class="text-text-secondary text-xs"
                >Лимиты и накопления</span
              >
            </div>
          </div>
          <div class="text-text-secondary">›</div>
        </GlassCard>
      </NuxtLink>
    </div>

    <GlassCard class="p-5 text-center">
      <GlassButton variant="soft" class="w-full" @click="logout">
        Выйти из аккаунта
      </GlassButton>
    </GlassCard>
  </div>
</template>
