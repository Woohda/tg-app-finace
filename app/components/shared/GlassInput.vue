<script setup lang="ts">
import { computed, ref } from "vue";
import type { Component } from "vue";
import { Input } from "~/components/ui/input";

const props = defineProps<{
  modelValue?: string | number | null;
  label?: string;
  placeholder?: string;
  type?: string;
  icon?: string | object | Component;
  step?: string | number;
}>();

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void;
}>();

const value = computed({
  get: () => props.modelValue ?? "",
  set: (val) => emits("update:modelValue", val),
});

const isFocused = ref(false);
const inputCompRef = ref<InstanceType<typeof Input> | null>(null);

const focus = () => {
  if (inputCompRef.value?.inputRef) {
    inputCompRef.value.inputRef.focus();
  }
};

defineExpose({ focus });
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-xs font-bold text-text-primary pl-3">{{
      label
    }}</label>
    <div
      :class="[
        'relative flex items-center group transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] transform-gpu',
        value || isFocused
          ? 'blur-0 opacity-100'
          : 'blur-[0.5px] opacity-70 hover:blur-0 hover:opacity-100',
      ]"
    >
      <div
        v-if="$slots.icon || icon"
        class="absolute z-10 left-3 flex items-center justify-center text-text-secondary pointer-events-none transition-colors duration-500"
      >
        <slot name="icon">
          <component
            :is="icon"
            v-if="typeof icon === 'object' || typeof icon === 'function'"
            class="size-5"
          />
          <span v-else class="font-bold text-lg">{{ icon }}</span>
        </slot>
      </div>
      <Input
        ref="inputCompRef"
        v-model="value"
        :type="type"
        :step="step"
        :placeholder="placeholder"
        :class="[
          'relative z-10 bg-transparent rounded-full px-5 text-text-primary font-medium text-base outline-none border-none transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] transform-gpu glass-pill',
          $slots.icon || icon ? 'pl-10' : '',
          'focus:shadow-[0_4px_20px_rgba(225,29,72,0.3)]!',
        ]"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
    </div>
  </div>
</template>
