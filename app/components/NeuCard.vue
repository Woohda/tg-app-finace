<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <UiCard :class="cn('neu-panel rounded-3xl border-0', props.class)">
    <slot />
  </UiCard>
</template>
