<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { useVModel } from "@vueuse/core";
import { cn } from "~/utils/cn";

const props = defineProps<{
  defaultValue?: string | number;
  modelValue?: string | number;
  class?: HTMLAttributes["class"];
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void;
}>();

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
});

const inputRef = ref<HTMLInputElement | null>(null);

defineExpose({ inputRef });
</script>

<template>
  <input
    ref="inputRef"
    v-model="modelValue"
    :class="
      cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:bg-transparent file:text-foreground file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 a11y-focus outline-none',
        props.class,
      )
    "
  />
</template>
