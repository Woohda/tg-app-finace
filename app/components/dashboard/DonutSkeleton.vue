<script setup lang="ts">
/**
 * @module app/components/dashboard/DonutSkeleton
 * @fileoverview Компонент скелетона для графика расходов.
 * @description
 * Отображает вращающееся кольцо во время загрузки данных,
 * сохраняя фирменную 3D Gummy/Plastic стилистику.
 */

const segments = [
  { id: 1, rotation: 0, color: "#FF514A" },
  { id: 2, rotation: 72, color: "#F42B70" },
  { id: 3, rotation: 144, color: "#9B44E3" },
  { id: 4, rotation: 216, color: "#FF9500" },
  { id: 5, rotation: 288, color: "#FFD075" },
];
</script>

<template>
  <svg
    class="w-full h-full -rotate-90 transform overflow-visible skeleton-spinner"
    viewBox="0 0 160 160"
  >
    <defs>
      <filter id="blur-sm" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" />
      </filter>
      <filter id="blur-md" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
    </defs>

    <!-- Группа с отбрасываемой тенью -->
    <g style="filter: drop-shadow(0px 6px 8px rgba(0, 0, 0, 0.22))">
      <!-- 1. Базовые цветные сегменты -->
      <g>
        <circle
          v-for="seg in segments"
          :key="'base-' + seg.id"
          cx="80"
          cy="80"
          :r="67"
          fill="none"
          :stroke="seg.color"
          :stroke-width="24"
          stroke-linecap="round"
          class="skeleton-base"
          :style="{
            transform: `rotate(${seg.rotation}deg)`,
            transformOrigin: '50% 50%',
          }"
        />
      </g>

      <!-- 2. Внешняя глубокая тень -->
      <g filter="url(#blur-md)">
        <circle
          v-for="seg in segments"
          :key="'shadow-' + seg.id"
          cx="80"
          cy="80"
          :r="74"
          fill="none"
          stroke="black"
          :stroke-width="8"
          stroke-opacity="0.25"
          stroke-linecap="round"
          class="pointer-events-none skeleton-shadow"
          :style="{
            transform: `rotate(${seg.rotation}deg)`,
            transformOrigin: '50% 50%',
          }"
        />
      </g>

      <!-- 3. Широкий мягкий блик -->
      <g filter="url(#blur-md)">
        <circle
          v-for="seg in segments"
          :key="'high-' + seg.id"
          cx="80"
          cy="80"
          :r="62"
          fill="none"
          stroke="white"
          :stroke-width="4"
          stroke-opacity="0.15"
          stroke-linecap="round"
          class="pointer-events-none skeleton-high"
          :style="{
            transform: `rotate(${seg.rotation}deg)`,
            transformOrigin: '50% 50%',
          }"
        />
      </g>

      <!-- 4. Узкий резкий блик -->
      <g filter="url(#blur-sm)">
        <circle
          v-for="seg in segments"
          :key="'sharp-' + seg.id"
          cx="80"
          cy="80"
          :r="59"
          fill="none"
          stroke="white"
          :stroke-width="1"
          stroke-opacity="0.25"
          stroke-linecap="round"
          class="pointer-events-none skeleton-sharp"
          :style="{
            transform: `rotate(${seg.rotation}deg)`,
            transformOrigin: '50% 50%',
          }"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.skeleton-spinner {
  /* Плавное общее вращение всего кольца */
  animation: spin-slow 10s linear infinite;
}

@keyframes spin-slow {
  0% { transform: rotate(-90deg); }
  100% { transform: rotate(270deg); }
}

.skeleton-base { animation: stretch-base 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
.skeleton-shadow { animation: stretch-shadow 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
.skeleton-high { animation: stretch-high 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
.skeleton-sharp { animation: stretch-sharp 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

/* Base (r=67, C=421) */
@keyframes stretch-base {
  0%   { stroke-dasharray: 0, 421; stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 60, 361; stroke-dashoffset: -500; }
  100% { stroke-dasharray: 0, 421; stroke-dashoffset: -84.2; }
}

/* Shadow (r=74, C=465) - scale = 1.1045 */
@keyframes stretch-shadow {
  0%   { stroke-dasharray: 0, 465; stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 66.3, 398.7; stroke-dashoffset: -552.2; }
  100% { stroke-dasharray: 0, 465; stroke-dashoffset: -93; }
}

/* Highlight (r=62, C=390) - scale = 0.9254 */
@keyframes stretch-high {
  0%   { stroke-dasharray: 0, 390; stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 55.5, 334.5; stroke-dashoffset: -462.7; }
  100% { stroke-dasharray: 0, 390; stroke-dashoffset: -77.9; }
}

/* Sharp (r=59, C=371) - scale = 0.8806 */
@keyframes stretch-sharp {
  0%   { stroke-dasharray: 0, 371; stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 52.8, 318.2; stroke-dashoffset: -440.3; }
  100% { stroke-dasharray: 0, 371; stroke-dashoffset: -74.1; }
}
</style>
