<script setup lang="ts">
/**
 * @module app/components/dashboard/DonutSkeleton
 * @fileoverview Компонент скелетона для графика расходов.
 * @description
 * Отображает вращающееся кольцо во время загрузки данных,
 * сохраняя фирменную стилистику стекла.
 */

const segments = [
  { id: 1, rotation: 0, color: "#d81a45" },
  { id: 2, rotation: 72, color: "#d84e1a" },
  { id: 3, rotation: 144, color: "#d8ad1a" },
  { id: 4, rotation: 216, color: "#1aa4d8" },
  { id: 5, rotation: 288, color: "#8e6bed" },
];
</script>

<template>
  <svg
    class="w-full h-full -rotate-90 transform overflow-visible skeleton-spinner"
    viewBox="0 0 160 160"
  >
    <defs>
      <filter id="glass-inset" x="-20%" y="-20%" width="140%" height="140%">
        <!-- border: 0.7px solid rgba(255, 255, 255, 0.4) -->
        <feMorphology operator="dilate" radius="0.7" in="SourceAlpha" result="dilated" />
        <feComposite operator="out" in="dilated" in2="SourceAlpha" result="border-mask" />
        <feFlood flood-color="rgba(255, 255, 255, 0.4)" result="border-color" />
        <feComposite operator="in" in="border-color" in2="border-mask" result="border" />

        <!-- inset 0 2px 3px rgba(255, 255, 255, 0.4) -->
        <feOffset dx="0" dy="2" in="SourceAlpha" />
        <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
        <feComposite operator="out" in="SourceAlpha" in2="offset-blur" result="inverse" />
        <feFlood flood-color="rgba(255, 255, 255, 0.4)" result="inset-color" />
        <feComposite operator="in" in="inset-color" in2="inverse" result="inset" />

        <feMerge>
          <feMergeNode in="border" />
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="inset" />
        </feMerge>
      </filter>
    </defs>

    <!-- Группа с отбрасываемой тенью -->
    <g style="filter: drop-shadow(0px 6px 8px rgba(0, 0, 0, 0.2))">
      <!-- 1. Базовые цветные сегменты -->
      <g filter="url(#glass-inset)">
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

/* Base (r=67, C=421) */
@keyframes stretch-base {
  0%   { stroke-dasharray: 0, 421; stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 60, 361; stroke-dashoffset: -500; }
  100% { stroke-dasharray: 0, 421; stroke-dashoffset: -84.2; }
}
</style>
