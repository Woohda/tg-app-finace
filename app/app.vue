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
const isLoading = useGlobalLoading();
const router = useRouter();

// Гарантированный сброс блокирующего лоадера после любого перехода между страницами
router.afterEach(() => {
  isLoading.value = false;
});
</script>

<template>
  <NuxtLayout>
    <NuxtErrorBoundary>
      <NuxtPage />
      <template #error="{ error, clearError }">
        <div
          class="p-6 text-center text-text-primary flex flex-col items-center justify-center min-h-[50vh]"
        >
          <p class="font-bold text-lg mb-2">Что-то пошло не так</p>
          <p class="text-xs text-text-secondary mb-4 max-w-xs">
            {{ error?.message || "Не удалось загрузить страницу" }}
          </p>
          <GlassButton variant="primary" size="sm" @click="clearError">
            Попробовать снова
          </GlassButton>
        </div>
      </template>
    </NuxtErrorBoundary>
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
