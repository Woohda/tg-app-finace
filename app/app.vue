<script setup lang="ts">
/**
 * @module app/app
 * @fileoverview Корневой компонент приложения
 * @description
 * Отображает общую разметку приложения, базовые глобальные оверлеи
 * (контейнер уведомлений ToastContainer, модальное окно создания транзакций TransactionModal)
 * и полноэкранный индикатор загрузки для критических блокирующих операций (авторизация, выход).
 * ---
 * ### Логика работы:
 * 1. Монтирует NuxtLayout и NuxtPage для маршрутизации с плавными переходами страниц.
 * 2. Предоставляет глобальные контейнеры модалок и тостов.
 * 3. Отображает экранный индикатор загрузки при явной активации useGlobalLoading.
 */
import { onMounted } from "vue";

const isLoading = useGlobalLoading();
const router = useRouter();

// Гарантированный сброс блокирующего лоадера после любого перехода между страницами
router.afterEach(() => {
  isLoading.value = false;
});

onMounted(() => {
  if (import.meta.client) {
    (window as unknown as { __FINO_MOUNTED__: boolean }).__FINO_MOUNTED__ = true;
    const banner = document.getElementById("fino-stalled-banner");
    if (banner) banner.remove();
  }
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <TransactionModal />
  <ToastContainer />
  <IosInstallPrompt />

  <Transition name="fade">
    <div
      v-if="isLoading"
      role="status"
      aria-live="polite"
      aria-label="Загрузка"
      class="fixed inset-0 flex items-center justify-center bg-black/15 backdrop-blur-[2px]"
      :style="{ zIndex: Z_INDEX.LOADER }"
    >
      <Loader class="text-text-accent" />
    </div>
  </Transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
