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
        'bg-milky',
        'border-[0.5px] border-white/50 border-b-transparent border-r-transparent',
        'shadow-neu-flat',
        'rounded-2xl',
        props.class,
      )
    "
  >
    <slot />
  </UiCard>
</template>
