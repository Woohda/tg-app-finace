<script setup lang="ts">
/**
 * @module app/components/dashboard/BalanceCard
 * @fileoverview Карточка общего баланса с мини-графиком (Sparkline)
 * @description
 * Отображает текущий баланс пользователя, процентное изменение за период и 
 * сглаженный график (d3-shape curveMonotoneX) истории баланса.
 * ---
 * ### Особенности:
 * - Стилистика: Neumorphism (использует NeuCard)
 * - График использует SVG linearGradient и mask-image для создания эффекта свечения и плавного появления.
 * - История масштабируется автоматически (min/max).
 */
import { computed } from "vue";
import { formatAmount, formatPercent } from "~/utils";
import NeuCard from "~/components/NeuCard.vue";
import { line, curveMonotoneX } from "d3-shape";

const props = defineProps<{
  balance: number;
  percentChange: number;
  history: number[];
}>();

const formattedPercent = computed(() => formatPercent(props.percentChange));

const width = 300;
const height = 80;
const marginY = 20;
const innerHeight = height - marginY * 2;

const min = computed(() => Math.min(...props.history));
const max = computed(() => Math.max(...props.history));

const points = computed(() => {
  if (props.history.length < 2) return [];
  const range = max.value - min.value || 1;
  const step = width / (props.history.length - 1);

  return props.history.map(
    (val, i) =>
      [
        i * step,
        marginY + innerHeight - ((val - min.value) / range) * innerHeight,
      ] as [number, number],
  );
});

const pathData = computed(() => {
  if (points.value.length < 2) return "";
  const generator = line().curve(curveMonotoneX);
  return generator(points.value) || "";
});

const areaPathData = computed(() => {
  if (!pathData.value) return "";
  return `${pathData.value} L ${width},${height} L 0,${height} Z`;
});
</script>

<template>
  <NeuCard class="flex flex-col gap-1 relative overflow-hidden h-45">
    <div class="z-10 flex justify-between items-start">
      <div>
        <p class="text-text-secondary text-md font-semibold mb-1">
          Общий баланс
        </p>
        <h2 class="text-4xl font-extrabold text-text-primary tracking-tight">
          {{ formatAmount(balance) }}
        </h2>
        <p
          class="text-xs font-bold mt-2 tracking-wide flex items-center gap-1"
          :class="percentChange >= 0 ? 'text-green-500' : 'text-red-500'"
        >
          <span class="text-lg leading-none mb-0.5"
            >{{ percentChange >= 0 ? "↑" : "↓" }}
          </span>
          {{ formattedPercent }}
        </p>
      </div>
    </div>

    <!-- Фон графика -->
    <div
      class="absolute bottom-0 left-0 right-0 h-24 z-0 pointer-events-none"
      style="
        -webkit-mask-image: linear-gradient(
          to right,
          transparent 1%,
          black 25%
        );
        mask-image: linear-gradient(to right, transparent 1%, black 25%);
      "
    >
      <svg
        class="w-full h-full"
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="var(--color-sunset-start)" />
            <stop offset="100%" stop-color="var(--color-sunset-orange)" />
          </linearGradient>

          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stop-color="var(--color-sunset-start)"
              stop-opacity="0.6"
            />
            <stop
              offset="50%"
              stop-color="var(--color-sunset-start)"
              stop-opacity="0.25"
            />
            <stop
              offset="100%"
              stop-color="var(--color-milky)"
              stop-opacity="0.0"
            />
          </linearGradient>
        </defs>

        <!-- Заливка области (Area) -->
        <path :d="areaPathData" fill="url(#areaGrad)" />

        <!-- Тонкая линия графика с мощным эффектом свечения (drop-shadow) -->
        <path
          :d="pathData"
          fill="none"
          stroke="url(#lineGrad)"
          stroke-width="1"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </NeuCard>
</template>
