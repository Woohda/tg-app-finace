<script setup lang="ts">
/**
 * @module app/pages/login
 * @fileoverview Страница авторизации через Telegram Mini App
 * @description
 * Отображает экран входа. Внутри Telegram автоматически авторизует пользователя
 * на основе `window.Telegram.WebApp.initData`. В обычном браузере в dev-режиме
 * авторизует через dev-endpoint автоматически.
 */
const { isAuthenticated, getTelegramInitData, initTelegramAuth, devLogin } = useAuth();
const router = useRouter();
const isDev = import.meta.dev;

if (isAuthenticated.value) {
  router.replace("/");
}

definePageMeta({
  layout: false,
});

const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const isInTelegram = ref(false);

const handleLogin = async () => {
  errorMessage.value = null;
  isLoading.value = true;
  const success = await initTelegramAuth();
  isLoading.value = false;

  if (success) {
    router.replace("/");
  } else {
    errorMessage.value = "Не удалось авторизоваться через Telegram. Попробуйте еще раз.";
  }
};

const handleDevLogin = async () => {
  errorMessage.value = null;
  isLoading.value = true;

  const success = await devLogin();
  isLoading.value = false;

  if (success) {
    router.replace("/");
  } else {
    errorMessage.value = "Ошибка dev-авторизации";
  }
};

onMounted(async () => {
  const initData = getTelegramInitData();
  isInTelegram.value = !!initData;

  if (initData && !isAuthenticated.value) {
    await handleLogin();
  } else if (isDev && !isAuthenticated.value) {
    // Dev-режим: автоматический вход без Telegram
    await handleDevLogin();
  }
});
</script>

<template>
  <div
    class="max-w-md mx-auto relative min-h-screen p-4 flex flex-col items-center justify-center bg-glass-ambient shadow-2xl"
  >
    <GlassCard class="w-full">
      <UiCardHeader class="p-5 pb-0">
        <UiCardTitle class="text-2xl font-bold text-center text-text-primary">
          TG Finance
        </UiCardTitle>
      </UiCardHeader>

      <UiCardContent class="p-5">
        <div class="text-center py-4">
          <div v-if="isInTelegram">
            <p class="mb-6 text-text-secondary text-sm">
              Вход через Telegram Mini App...
            </p>
            <p v-if="errorMessage" class="mb-4 text-xs text-rose-500 font-medium">
              {{ errorMessage }}
            </p>
            <GlassButton
              size="lg"
              variant="primary"
              class="w-full"
              :disabled="isLoading"
              @click="handleLogin"
            >
              {{ isLoading ? "Авторизация..." : "Войти через Telegram" }}
            </GlassButton>
          </div>

          <div v-else class="flex flex-col items-center gap-3">
            <p v-if="isDev" class="text-sm text-text-accent font-medium">
              🛠 Dev Mode
            </p>
            <p class="text-sm text-text-secondary">
              {{ isDev ? 'Автоматическая авторизация...' : 'Это приложение разработано для работы внутри Telegram.' }}
            </p>
            <p v-if="errorMessage" class="text-xs text-rose-500 font-medium">
              {{ errorMessage }}
            </p>
            <p v-if="!isDev" class="text-xs text-text-secondary/70">
              Пожалуйста, откройте бота в Telegram и запустите Mini App через кнопку «Открыть трекер 📊».
            </p>
            <GlassButton
              size="lg"
              variant="primary"
              class="w-full mt-4"
              :disabled="isLoading"
              @click="isDev ? handleDevLogin() : handleLogin()"
            >
              {{ isLoading ? "Проверка..." : (isDev ? "Dev Login" : "Повторить попытку") }}
            </GlassButton>
          </div>
        </div>
      </UiCardContent>
    </GlassCard>
  </div>
</template>
