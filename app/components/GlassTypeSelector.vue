<script setup lang="ts">
import { RadioGroupRoot, RadioGroupItem } from "reka-ui";
import { BanknoteArrowUp, BanknoteArrowDown } from "@lucide/vue";

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();
</script>

<template>
  <RadioGroupRoot
    :model-value="modelValue"
    class="flex gap-5 w-full"
    aria-label="Тип транзакции"
    @update:model-value="emit('update:modelValue', $event as string)"
  >
    <RadioGroupItem
      value="income"
      class="group flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-4xl glass-panel border-[0.5px] border-white/50 border-b-transparent border-r-transparent transition-all duration-300 outline-none data-[state=checked]:shadow-glass-inner data-[state=checked]:bg-white/40"
    >
      <BanknoteArrowUp
        class="size-10 transition-colors duration-300 group-data-[state=checked]:text-accent-end"
        stroke-width="1.5"
      />
      <span class="text-sm text-text-secondary">Доход</span>
    </RadioGroupItem>

    <RadioGroupItem
      value="expense"
      class="group flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-4xl glass-panel border-[0.5px] border-white/50 border-b-transparent border-r-transparent transition-all duration-300 outline-none data-[state=checked]:shadow-glass-inner data-[state=checked]:bg-white/40"
    >
      <BanknoteArrowDown
        class="size-10 transition-colors duration-300 group-data-[state=checked]:text-accent-end"
        stroke-width="1.5"
      />
      <span class="text-sm text-text-secondary">Расход</span>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
