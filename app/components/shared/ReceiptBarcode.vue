<script setup lang="ts">
/**
 * @module app/components/shared/ReceiptBarcode
 * @fileoverview Векторный штрихкод для аутентичной стилизации кассовых чеков
 * @description
 * Отображает контрастный штрихкод в формате SVG с переменной шириной полос.
 * Используется в чеках совместных трат (ExpenseReceiptCard) и финансовых операциях (TransactionsOperationsList).
 */
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils/cn";

interface Props {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  class: undefined,
});
</script>

<template>
  <svg
    :class="cn('w-36 h-8 text-black shrink-0', props.class)"
    viewBox="0 0 144 28"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="0" y="0" width="2" height="28" />
    <rect x="4" y="0" width="1.5" height="28" />
    <rect x="8" y="0" width="3" height="28" />
    <rect x="13" y="0" width="1" height="28" />
    <rect x="16" y="0" width="2" height="28" />
    <rect x="20" y="0" width="3.5" height="28" />
    <rect x="26" y="0" width="1.5" height="28" />
    <rect x="30" y="0" width="2" height="28" />
    <rect x="34" y="0" width="1" height="28" />
    <rect x="37" y="0" width="3" height="28" />
    <rect x="42" y="0" width="2" height="28" />
    <rect x="46" y="0" width="1" height="28" />
    <rect x="49" y="0" width="3.5" height="28" />
    <rect x="55" y="0" width="2" height="28" />
    <rect x="59" y="0" width="1" height="28" />
    <rect x="62" y="0" width="3" height="28" />
    <rect x="67" y="0" width="1.5" height="28" />
    <rect x="71" y="0" width="2" height="28" />
    <rect x="75" y="0" width="3.5" height="28" />
    <rect x="81" y="0" width="1" height="28" />
    <rect x="84" y="0" width="3" height="28" />
    <rect x="89" y="0" width="2" height="28" />
    <rect x="93" y="0" width="1" height="28" />
    <rect x="96" y="0" width="3.5" height="28" />
    <rect x="102" y="0" width="2" height="28" />
    <rect x="106" y="0" width="1.5" height="28" />
    <rect x="110" y="0" width="3" height="28" />
    <rect x="115" y="0" width="2" height="28" />
    <rect x="119" y="0" width="1" height="28" />
    <rect x="122" y="0" width="3.5" height="28" />
    <rect x="128" y="0" width="2" height="28" />
    <rect x="132" y="0" width="1" height="28" />
    <rect x="135" y="0" width="2" height="28" />
    <rect x="139" y="0" width="1.5" height="28" />
    <rect x="142" y="0" width="2" height="28" />
  </svg>
</template>
