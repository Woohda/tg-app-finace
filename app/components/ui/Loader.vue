<script setup lang="ts">
/**
 * @module app/components/ui/Loader
 * @fileoverview Индикатор загрузки
 * @description
 * Отображает анимированный индикатор загрузки с использованием box-shadow.
 */
</script>

<template>
  <div class="w-2 aspect-square rounded-full bg-current loader" />
</template>

<style scoped lang="css">
.loader {
  box-shadow:
    -12px 0px,
    12px 0px;
  animation: load 1.1s infinite linear;
}
@keyframes load {
  25% {
    box-shadow:
      -12px -12px,
      12px 12px;
  }
  50% {
    box-shadow:
      0px -12px,
      0px 12px;
  }
  75% {
    box-shadow:
      12px -12px,
      -12px 12px;
  }
  100% {
    box-shadow:
      12px 0px,
      -12px 0px;
  }
}
</style>
