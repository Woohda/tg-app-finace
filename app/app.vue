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
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <TransactionModal />
  <ToastContainer />

  <Transition name="fade">
    <div
      v-if="isLoading"
      class="fixed inset-0 z-100 flex items-center justify-center bg-black/15 backdrop-blur-[2px]"
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
