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
      <!-- Дублируем фильтр, чтобы он был доступен, когда основной SVG скрыт -->
      <filter
        id="glossy-volumetric-skeleton"
        x="-30%"
        y="-30%"
        width="160%"
        height="160%"
        color-interpolation-filters="sRGB"
      >
        <!-- 1. Внутреннее свечение / Объем (Слева сверху) -->
        <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blurLight" />
        <feOffset dx="-3" dy="-3" in="blurLight" result="offsetBlurLight" />
        <feComposite
          in="SourceAlpha"
          in2="offsetBlurLight"
          operator="out"
          result="highlightArea"
        />
        <feFlood
          flood-color="#ffffff"
          flood-opacity="0.6"
          result="highlightColor"
        />
        <feComposite
          in="highlightColor"
          in2="highlightArea"
          operator="in"
          result="highlight"
        />

        <!-- 2. Темная внутренняя тень (Справа снизу) -->
        <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blurDark" />
        <feOffset dx="2" dy="2" in="blurDark" result="offsetBlurDark" />
        <feComposite
          in="SourceAlpha"
          in2="offsetBlurDark"
          operator="out"
          result="shadowArea"
        />
        <feFlood
          flood-color="#000000"
          flood-opacity="0.2"
          result="shadowColor"
        />
        <feComposite
          in="shadowColor"
          in2="shadowArea"
          operator="in"
          result="innerShadow"
        />

        <!-- 3. Мягкая внешняя тень -->
        <feDropShadow
          in="SourceAlpha"
          dx="0"
          dy="1"
          stdDeviation="6"
          flood-color="rgba(0,0,0,0.1)"
          result="drop"
        />

        <!-- Объединяем все слои -->
        <feMerge>
          <feMergeNode in="drop" />
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="innerShadow" />
          <feMergeNode in="highlight" />
        </feMerge>
      </filter>
    </defs>

    <circle
      v-for="seg in segments"
      :key="seg.id"
      cx="80"
      cy="80"
      :r="67"
      fill="none"
      :stroke="seg.color"
      :stroke-width="24"
      stroke-linecap="round"
      filter="url(#glossy-volumetric-skeleton)"
      class="skeleton-segment"
      :style="{
        transform: `rotate(${seg.rotation}deg)`,
        transformOrigin: '50% 50%',
      }"
    />
  </svg>
</template>

<style scoped>
.skeleton-spinner {
  /* Плавное общее вращение всего кольца */
  animation: spin-slow 10s linear infinite;
}

@keyframes spin-slow {
  0% {
    transform: rotate(-90deg);
  }
  100% {
    transform: rotate(270deg);
  }
}

.skeleton-segment {
  /* Анимация "гусеницы": растягивание и сжатие в точку */
  animation: stretch-segment 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes stretch-segment {
  0% {
    /* Точка */
    stroke-dasharray: 0, 421;
    stroke-dashoffset: 0;
  }
  50% {
    /* Растянутая линия */
    stroke-dasharray: 60, 361;
    stroke-dashoffset: -500;
  }
  100% {
    /* Снова точка, но смещенная на 1/5 длины окружности (420.97 / 5 = 84.195) */
    stroke-dasharray: 0, 421;
    stroke-dashoffset: -84.195;
  }
}
</style>
