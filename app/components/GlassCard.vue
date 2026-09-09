<script setup lang="ts">
/**
 * @module app/components/GlassCard
 * @fileoverview Базовая карточка-контейнер в стиле неоморфизм
 * @description
 * Служит оберткой для контента (использует UiCard), применяет 
 * фирменные стили неоморфизма (.glass-panel), мягкие углы (rounded-3xl) и отступы.
 */
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <UiCard :class="cn('glass-panel rounded-3xl border-0 p-5', props.class)">
    <slot />
  </UiCard>
</template>
