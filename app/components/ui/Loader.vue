<script setup lang="ts">
/**
 * @module app/components/ui/Loader
 * @fileoverview Индикатор загрузки
 * @description
 * Отображает анимированный индикатор загрузки с использованием box-shadow.
 */
</script>

<template>
  <div class="w-1.75 aspect-square rounded-full bg-current loader" />
</template>

<style scoped lang="css">
.loader {
  box-shadow:
    -11px 0px,
    11px 0px;
  animation: load 1.15s infinite linear;
}
@keyframes load {
  25% {
    box-shadow:
      -11px -11px,
      11px 11px;
  }
  50% {
    box-shadow:
      0px -11px,
      0px 11px;
  }
  75% {
    box-shadow:
      11px -11px,
      -11px 11px;
  }
  100% {
    box-shadow:
      11px 0px,
      -11px 0px;
  }
}
</style>
