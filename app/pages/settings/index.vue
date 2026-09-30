<script setup lang="ts">
/**
 * @module app/pages/settings
 * @fileoverview Экран настроек профиля и приложения
 * @description
 * Отображает профиль Telegram, позволяет выйти из аккаунта и предоставляет
 * навигацию к управлению бюджетом и категориями.
 */
import { ChevronRight } from "@lucide/vue";

interface SettingsNavigationItem {
  to: string;
  icon: string;
  title: string;
  description: string;
}

const SETTINGS_LINKS: readonly SettingsNavigationItem[] = [
  {
    to: "/budget",
    icon: "🎯",
    title: "Бюджет и цели",
    description: "Планирование расходов",
  },
  {
    to: "/categories",
    icon: "📁",
    title: "Мои категории",
    description: "Настроить свои категории",
  },
  {
    to: "/subscription",
    icon: "📅",
    title: "Регулярные платежи",
    description: "Подписки и ежемесячные счета",
  },
] as const;

const { user, userName, avatarUrl, logout, getWebLoginLink } = useAuth();
const isLoading = useGlobalLoading();
const isGeneratingLink = ref(false);

const {
  init: initPwa,
  isIOS,
  isAndroid,
  isInstallable,
  installApp,
  isInTelegram,
  isStandalone,
} = usePwaInstall();

onMounted(() => {
  if (import.meta.client) {
    initPwa();
  }
});

const installCardTitle = computed(() => {
  if (isIOS.value) return "Установить на iPhone";
  if (isAndroid.value) return "Установить на Android";
  return "Установить приложение";
});

const installCardDescription = computed(() => {
  if (isGeneratingLink.value) return "Генерация ссылки...";
  if (isIOS.value) return "Открыть в Safari и добавить на экран";
  if (isAndroid.value) return "Открыть в Chrome и установить";
  return "Открыть веб-версию для установки";
});

const handleInstallClick = async () => {
  // Если пользователь уже в браузере на Android и доступен нативный prompt
  if (isAndroid.value && isInstallable.value && !isInTelegram.value) {
    await installApp();
    return;
  }

  try {
    isGeneratingLink.value = true;
    const url = await getWebLoginLink();
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  } catch (error) {
    console.error("Ошибка генерации ссылки:", error);
  } finally {
    isGeneratingLink.value = false;
  }
};

const handleLogout = async () => {
  isLoading.value = true;
  logout();
  await navigateTo("/login");
  isLoading.value = false;
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col text-center">
      <h1 class="text-text-primary text-xl font-bold tracking-wide">
        Настройки
      </h1>
      <p class="text-text-secondary text-xs">Профиль и параметры приложения</p>
    </div>

    <GlassCard>
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
      <NuxtLink
        v-for="item in SETTINGS_LINKS"
        :key="item.to"
        :to="item.to"
        class="block a11y-focus rounded-3xl focus-visible:outline-offset-4"
      >
        <GlassCard
          class="p-4 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div
              class="size-11 rounded-full glass-pill flex items-center justify-center text-text-primary shrink-0"
            >
              <span class="text-[22px]">{{ item.icon }}</span>
            </div>
            <div class="flex flex-col items-start">
              <span class="text-text-primary font-bold text-base">
                {{ item.title }}
              </span>
              <span class="text-text-secondary text-xs">
                {{ item.description }}
              </span>
            </div>
          </div>
          <ChevronRight class="size-5 text-text-secondary opacity-60" />
        </GlassCard>
      </NuxtLink>

      <GlassCard
        v-if="!isStandalone"
        class="p-4 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 cursor-pointer a11y-focus"
        role="button"
        tabindex="0"
        @click="handleInstallClick"
        @keydown.enter="handleInstallClick"
      >
        <div class="flex items-center gap-3">
          <div
            class="size-11 rounded-full glass-pill flex items-center justify-center text-text-primary shrink-0"
          >
            <span class="text-[22px]">📲</span>
          </div>
          <div class="flex flex-col items-start">
            <span class="text-text-primary font-bold text-base">
              {{ installCardTitle }}
            </span>
            <span class="text-text-secondary text-xs">
              {{ installCardDescription }}
            </span>
          </div>
        </div>
        <ChevronRight class="size-5 text-text-secondary opacity-60" />
      </GlassCard>
    </div>

    <GlassCard>
      <GlassButton
        variant="soft"
        class="w-full"
        :disabled="isLoading"
        @click="handleLogout"
      >
        {{ isLoading ? "Выход..." : "Выйти из аккаунта" }}
      </GlassButton>
    </GlassCard>
  </div>
</template>
