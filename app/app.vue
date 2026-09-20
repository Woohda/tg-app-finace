<script setup lang="ts">
/**
 * @module app/app
 * @fileoverview Корневой компонент приложения.
 * @description
 * Обеспечивает отображение глобальных компонентов (ToastContainer, TransactionModal)
 * и базового лоадера во время переходов между страницами.
 */
const isLoading = useGlobalLoading();
const nuxtApp = useNuxtApp();

onMounted(() => {
  nuxtApp.hook("page:start", () => {
    isLoading.value = true;
  });
  nuxtApp.hook("page:finish", () => {
    isLoading.value = false;
  });
});
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
