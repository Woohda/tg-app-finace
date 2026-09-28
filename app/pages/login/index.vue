<script setup lang="ts">
/**
 * @module app/pages/login
 * @fileoverview Страница авторизации через Telegram Mini App
 * @description
 * Отображает экран входа. Внутри Telegram автоматически авторизует пользователя
 * на основе `window.Telegram.WebApp.initData`. В обычном браузере в dev-режиме
 * авторизует через dev-endpoint автоматически.
 */
const {
  isAuthenticated,
  getTelegramInitData,
  initTelegramAuth,
  loginWithTicket,
  devLogin,
} = useAuth();
const router = useRouter();
const route = useRoute();
const isDev = import.meta.dev;

if (isAuthenticated.value) {
  router.replace("/");
}

definePageMeta({
  layout: false,
});

const isLoading = useGlobalLoading();
const errorMessage = ref<string | null>(null);
const isInTelegram = ref(false);

// Включаем загрузку сразу на клиенте, чтобы не было "моргания" экрана входа
// перед автоматической авторизацией через Telegram, Ticket или DevMode.
if (import.meta.client && !isAuthenticated.value) {
  isLoading.value = true;
}

const handleLogin = async () => {
  errorMessage.value = null;
  isLoading.value = true;
  const success = await initTelegramAuth();

  if (success) {
    await router.replace("/");
  } else {
    errorMessage.value =
      "Не удалось авторизоваться через Telegram. Попробуйте еще раз.";
  }
  isLoading.value = false;
};

const handleDevLogin = async () => {
  errorMessage.value = null;
  isLoading.value = true;

  const success = await devLogin();

  if (success) {
    await router.replace("/");
  } else {
    errorMessage.value = "Ошибка dev-авторизации";
  }
  isLoading.value = false;
};

onMounted(async () => {
  // 1. Проверяем вход по одноразовому тикету из ссылки (/login?ticket=...)
  const ticket = route.query.ticket;
  if (typeof ticket === "string" && ticket.trim()) {
    isLoading.value = true;
    const success = await loginWithTicket(ticket.trim());
    if (success) {
      await router.replace("/");
      return;
    } else {
      errorMessage.value =
        "Ссылка для входа недействительна или устарела. Запросите новую ссылку у бота командой /web.";
      isLoading.value = false;
      return;
    }
  }

  // 2. Если открыто внутри Telegram Mini App
  const initData = getTelegramInitData();
  isInTelegram.value = !!initData;

  if (initData && !isAuthenticated.value) {
    await handleLogin();
  } else if (isDev && !isAuthenticated.value) {
    // Dev-режим: автоматический вход без Telegram
    await handleDevLogin();
  } else {
    // Если авто-вход невозможен (не в ТГ и не dev) — скрываем лоадер
    isLoading.value = false;
  }
});
</script>

<template>
  <div
    class="max-w-md mx-auto relative min-h-screen p-4 flex flex-col items-center justify-center bg-glass-ambient shadow-2xl"
  >
    <GlassCard class="w-full">
      <div class="p-5 pb-0">
        <h1 class="text-2xl font-bold text-center text-text-primary">
          TG Finance
        </h1>
      </div>

      <div class="p-5">
        <div class="text-center py-4">
          <div v-if="isInTelegram">
            <p class="mb-6 text-text-secondary text-sm">
              Вход через Telegram Mini App...
            </p>
            <p
              v-if="errorMessage"
              class="mb-4 text-xs text-rose-500 font-medium"
            >
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

          <div v-else class="flex flex-col items-center gap-3 text-center">
            <div
              class="w-12 h-12 rounded-2xl glass-milky flex items-center justify-center text-2xl mb-1 shadow-glass-sm"
            >
              📲
            </div>
            <h2 class="text-base font-semibold text-text-primary">
              Вход в Safari / PWA
            </h2>
            <p class="text-xs text-text-secondary leading-relaxed">
              Чтобы открыть приложение на iPhone без пароля, запросите ссылку у
              бота командой
              <span
                class="px-1.5 py-0.5 rounded bg-white/10 text-text-accent font-mono text-xs"
                >/web</span
              >
            </p>
            <p v-if="errorMessage" class="text-xs text-rose-500 font-medium">
              {{ errorMessage }}
            </p>

            <a
              href="https://t.me/vfino_bot?start=web"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full mt-2"
            >
              <GlassButton
                size="lg"
                variant="primary"
                class="w-full"
                :disabled="isLoading"
              >
                💬 Получить ссылку в Telegram
              </GlassButton>
            </a>

            <div v-if="isDev" class="w-full pt-3 border-t border-white/10 mt-2">
              <GlassButton
                size="sm"
                variant="soft"
                class="w-full"
                :disabled="isLoading"
                @click="handleDevLogin"
              >
                🛠 Dev Login
              </GlassButton>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  </div>
</template>
