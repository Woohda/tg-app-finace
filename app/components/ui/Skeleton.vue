<script setup lang="ts">
/**
 * @module app/components/ui/Skeleton
 * @fileoverview Компонент скелетной загрузки (Skeleton loader).
 * @description
 * Отображает мерцающий блок для индикации процесса загрузки контента.
 * Использует glassmorphism стили.
 */
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{ rounded?: string }>(), {
  rounded: "rounded-md",
});
</script>

<template>
  <div
    class="relative overflow-hidden bg-white/40 backdrop-blur-md"
    style="
      box-shadow:
        inset 0 1px 1px rgba(255, 255, 255, 0.1),
        inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    "
    :class="[rounded, $attrs.class]"
  >
    <div class="absolute inset-0 shimmer-glare" />
  </div>
</template>

<style scoped>
.shimmer-glare {
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.2) 20%,
    rgba(255, 255, 255, 0) 35%,
    rgba(255, 255, 255, 0.2) 42%,
    rgba(255, 255, 255, 1) 50%,
    rgba(255, 255, 255, 0.2) 58%,
    rgba(255, 255, 255, 0) 65%,
    rgba(255, 255, 255, 0.2) 80%,
    rgba(255, 255, 255, 0.5) 100%
  );
  background-size: 200% 100%;
  animation: glare 4s infinite linear;
}

@keyframes glare {
  0% {
    background-position: 300% 0;
  }
  100% {
    background-position: -300% 0;
  }
}
</style>
