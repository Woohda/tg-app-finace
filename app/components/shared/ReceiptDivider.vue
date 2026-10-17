<script setup lang="ts">
/**
 * @module app/components/shared/ReceiptDivider
 * @fileoverview Легковесный перфорированный разделитель кассового чека
 * @description
 * Отображает пунктирную (dotted) или перфорированную штриховую (dashed) линию отрыва для кассовых чеков.
 * В режиме 'dashed' использует легковесный тайловый градиент с аппаратным ускорением GPU
 * для точного контроля удлиненных полос (8px штрих / 4px зазор) без создания тяжелых SVG DOM-узлов.
 */
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils/cn";

interface Props {
  variant?: "dotted" | "dashed";
  class?: HTMLAttributes["class"];
}

withDefaults(defineProps<Props>(), {
  variant: "dotted",
  class: undefined,
});
</script>

<template>
  <div :class="cn('w-full', $props.class)">
    <!-- Удлиненный перфорированный штрих (8px штрих, 4px пробел) на чистом CSS -->
    <div
      v-if="variant === 'dashed'"
      class="w-full h-0.5 bg-[linear-gradient(to_right,currentColor_66%,transparent_66%)] bg-size-[14.75px] bg-repeat-x text-text-secondary/50"
    />
    <!-- Точечный пунктир -->
    <div
      v-else
      class="w-full border-t-2 border-dotted border-text-secondary/50"
    />
  </div>
</template>
