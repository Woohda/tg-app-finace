<script setup lang="ts">
/**
 * @module app/pages/login
 * @fileoverview Страница авторизации через Telegram Mini App
 * @description
 * Отображает экран входа с кнопкой авторизации.
 * После успешного входа перенаправляет на Dashboard.
 * ---
 * ### Логика работы:
 * 1. Проверяет наличие активной сессии — если уже авторизован, редиректит на `/`
 * 2. При нажатии кнопки отправляет `initData` на сервер через `useAuth`
 * 3. После успешной авторизации навигирует на главную страницу
 */
const { isAuthenticated, loginWithTelegram } = useAuth();
const router = useRouter();

if (isAuthenticated.value) {
  router.replace("/");
}

definePageMeta({
  layout: false,
});

// Фейковые данные (мокаем то, что прислал бы реальный Telegram)
const mockInitData =
  "query_id=AAF...&user=%7B%22id%22%3A999111%2C%22username%22%3A%22test_investor%22%7D&auth_date=1690000000&hash=mockhash";

const isLoading = ref(false);

const handleLogin = async () => {
  isLoading.value = true;
  const success = await loginWithTelegram(mockInitData);
  isLoading.value = false;

  if (success) {
    router.replace("/");
  }
};
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
          <p class="mb-8 text-text-secondary">Вы не вошли в систему.</p>
          <NeuButton
            size="lg"
            variant="primary"
            class="w-full"
            :disabled="isLoading"
            @click="handleLogin"
          >
            {{ isLoading ? "Вход..." : "Войти через Telegram (Mock)" }}
          </NeuButton>
        </div>
      </UiCardContent>
    </NeuCard>
  </div>
</template>
