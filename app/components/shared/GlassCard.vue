<script setup lang="ts">
/**
 * @module app/components/GlassCard
 * @fileoverview Базовая карточка-контейнер в стиле Glassmorphism
 * @description
 * Служит стилизованной подложной для контента, применяет
 * фирменные стили (.glass-milky), мягкие скругления (rounded-3xl) и внутренние отступы.
 */
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils/cn";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div :class="cn('glass-milky rounded-3xl p-5', props.class)">
    <slot />
  </div>
</template>
