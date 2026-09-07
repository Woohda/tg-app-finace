<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <UiCard
    :class="
      cn(
        'neu-panel',
        'rounded-3xl',
        props.class,
      )
    "
  >
    <slot />
  </UiCard>
</template>
