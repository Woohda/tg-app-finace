<script setup lang="ts">
/**
 * @module app/pages/login
 * @fileoverview Страница авторизации через Telegram Mini App
 * @description
 * Отображает экран входа. Внутри Telegram автоматически авторизует пользователя
 * на основе `window.Telegram.WebApp.initData`. В обычном браузере выводит сообщение
 * о необходимости запуска через Telegram бота.
 * ---
 * ### Логика работы:
 * 1. Проверяет наличие активной сессии — если уже авторизован, редиректит на `/`
 * 2. При наличии `initData` пытается автоматически авторизоваться через `initTelegramAuth`
 * 3. Если запуск вне Telegram, предлагает открыть приложение через Telegram бота
 */
const { isAuthenticated, getTelegramInitData, initTelegramAuth } = useAuth();
const router = useRouter();

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

onMounted(async () => {
  const initData = getTelegramInitData();
  isInTelegram.value = !!initData;

  if (initData && !isAuthenticated.value) {
    await handleLogin();
  }
});
</script>

<template>
  <div
    class="max-w-md mx-auto relative min-h-screen p-4 flex flex-col items-center justify-center bg-sunset-ambient shadow-2xl"
  >
    <NeuCard class="w-full">
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
            <NeuButton
              size="lg"
              variant="primary"
              class="w-full"
              :disabled="isLoading"
              @click="handleLogin"
            >
              {{ isLoading ? "Авторизация..." : "Войти через Telegram" }}
            </NeuButton>
          </div>

          <div v-else class="flex flex-col items-center gap-3">
            <p class="text-sm text-text-secondary">
              Это приложение разработано для работы внутри Telegram.
            </p>
            <p class="text-xs text-text-secondary/70">
              Пожалуйста, откройте бота в Telegram и запустите Mini App через кнопку «Открыть трекер 📊».
            </p>
            <NeuButton
              size="lg"
              variant="primary"
              class="w-full mt-4"
              :disabled="isLoading"
              @click="handleLogin"
            >
              {{ isLoading ? "Проверка..." : "Повторить попытку" }}
            </NeuButton>
          </div>
        </div>
      </UiCardContent>
    </NeuCard>
  </div>
</template>
