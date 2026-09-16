<script setup lang="ts">
/**
 * @module app/components/dashboard/BalanceCard
 * @fileoverview Карточка общего баланса с мини-графиком (Sparkline)
 * @description
 * Отображает текущий баланс пользователя, процентное изменение за период и
 * сглаженный график (d3-shape curveMonotoneX) истории баланса.
 * ---
 * ### Особенности:
 * - Стилистика: Glassmorphism (использует GlassCard)
 * - График использует SVG linearGradient и mask-image для создания эффекта свечения и плавного появления.
 * - История масштабируется автоматически (min/max).
 */
import { computed } from "vue";
import { formatAmount, formatPercent } from "~/utils";
import { line, curveMonotoneX } from "d3-shape";

const props = defineProps<{
  balance: number;
  percentChange: number;
  history: number[];
  isLoading?: boolean;
}>();

const formattedPercent = computed(() => formatPercent(props.percentChange, "трат в день"));

const width = 300;
const height = 80;
const marginY = 20;
const innerHeight = height - marginY * 2;

const min = computed(() => Math.min(...props.history));
const max = computed(() => Math.max(...props.history));

const points = computed(() => {
  if (props.isLoading) {
    // Красивая плавная кривая-заглушка для загрузки
    return [
      [0, 60],
      [75, 30],
      [150, 50],
      [225, 20],
      [300, 40],
    ] as [number, number][];
  }

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
  <GlassCard class="flex flex-col gap-1 relative overflow-hidden h-45">
    <div class="z-10 flex justify-between items-start">
      <!-- Состояние загрузки: Скелетоны текста -->
      <div v-if="isLoading" class="flex flex-col gap-2 py-1">
        <Skeleton class="w-30 h-4" />
        <Skeleton class="w-40 h-9 rounded-lg" />
        <Skeleton class="w-20 h-3" />
      </div>

      <!-- Загруженное состояние: Текст баланса -->
      <div v-else class="fade-in">
        <p class="text-text-secondary text-md font-semibold mb-1">
          Общий баланс
        </p>
        <h2 class="text-4xl font-extrabold text-text-primary tracking-tight">
          {{ formatAmount(balance) }}
        </h2>
        <p
          class="text-xs font-bold mt-2 tracking-wide flex items-center gap-1"
          :class="percentChange <= 0 ? 'text-green-500' : 'text-red-500'"
        >
          <span class="text-lg leading-none mb-0.5"
            >{{ percentChange > 0 ? "↑" : "↓" }}
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
          black 10%
        );
        mask-image: linear-gradient(to right, transparent 1%, black 10%);
      "
    >
      <svg
        class="w-full h-full"
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FF9500" />
            <stop offset="50%" stop-color="#F42B70" />
            <stop offset="100%" stop-color="#9B44E3" />
          </linearGradient>

          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stop-color="var(--color-accent-mid)"
              stop-opacity="0.25"
            />
            <stop
              offset="60%"
              stop-color="var(--color-accent-start)"
              stop-opacity="0.08"
            />
            <stop
              offset="100%"
              stop-color="var(--color-accent-start)"
              stop-opacity="0"
            />
          </linearGradient>
        </defs>

        <!-- Заливка области (Area) -->
        <path
          :d="areaPathData"
          fill="url(#areaGrad)"
          :class="{ 'loading-area': isLoading, 'fade-in': !isLoading }"
        />

        <!-- Тонкая линия графика с мощным эффектом свечения (drop-shadow) -->
        <path
          :d="pathData"
          fill="none"
          stroke="url(#lineGrad)"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="filter: drop-shadow(0px 6px 8px rgba(239, 69, 48, 0.4))"
          :class="{ 'loading-chart-line': isLoading, 'chart-line': !isLoading }"
        />
      </svg>
    </div>
  </GlassCard>
</template>

<style scoped>
/* Анимация "роста" линии при загрузке */
.loading-chart-line {
  stroke-dasharray: 400;
  stroke-dashoffset: 400;
  animation: draw-line 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes draw-line {
  0% {
    stroke-dashoffset: 400;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  70% {
    stroke-dashoffset: 0;
    opacity: 1;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 0;
  }
}

.loading-area {
  animation: fade-area 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes fade-area {
  0%,
  30% {
    opacity: 0;
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Плавное появление после загрузки */
.fade-in {
  animation: fade-in 2s ease-out;
}
.chart-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw-real 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes draw-real {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
