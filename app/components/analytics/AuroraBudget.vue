<script setup lang="ts">
/**
 * @module app/components/analytics/AuroraBudget
 * @fileoverview Фоновое "дышащее" пятно для отображения состояния бюджета.
 * @description
 * Отображает анимированный радиальный градиент. Меняет цвет от сине-фиолетового 
 * (бюджет в норме) к оранжево-красному (бюджет превышен) в зависимости от процента трат.
 */
import { computed } from "vue";

interface Props {
  percent: number;
  budget?: number;
  spent?: number;
}

const props = withDefaults(defineProps<Props>(), {
  budget: 0,
  spent: 0,
});

// Цвет зависит от процента
const blobColor = computed(() => {
  const p = props.percent;
  if (p < 50) return "rgba(46, 213, 115, 0.45)"; // Мятный (Спокойно)
  if (p < 85) return "rgba(255, 165, 2, 0.45)"; // Персиковый/Оранжевый (Внимание)
  return "rgba(225, 29, 72, 0.55)"; // Винный (Опасность)
});

// Скорость пульсации
const animationDuration = computed(() => {
  const p = props.percent;
  if (p < 50) return "10s";
  if (p < 85) return "7s";
  return "4s";
});

// Размер пятна увеличивается при приближении к 100%
const baseScale = computed(() => {
  const p = props.percent;
  if (p < 50) return 0.9;
  if (p < 85) return 1.05;
  return 1.25;
});
</script>

<template>
  <div
    class="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden"
  >
    <!-- Свечение / Aurora Blob -->
    <div
      class="aurora-blob absolute"
      :style="{
        backgroundColor: blobColor,
        animationDuration: animationDuration,
        '--base-scale': baseScale,
      }"
    />

    <!-- Текст процента в верхнем правом углу (эффект вдавленного стекла) -->
    <div class="absolute top-2 right-4 flex items-start pointer-events-none">
      <span
        class="text-[80px] font-extrabold tracking-tighter leading-none glass-text"
        style="font-family: var(--font-sans)"
      >
        {{ Math.round(percent) }}
      </span>
      <span
        class="text-3xl font-bold mt-2 ml-1 glass-text"
        style="font-family: var(--font-sans)"
        >%</span
      >
    </div>
  </div>
</template>

<style scoped>
.aurora-blob {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  filter: blur(60px);
  top: -40px;
  right: -20px;
  animation: blob-float ease-in-out infinite alternate;
  transition: background-color 1s ease;
}

/* Эффект "растворенного в стекле" (вдавленный) текста */
.glass-text {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.4) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;

  filter: drop-shadow(1px 2px 4px rgba(0, 0, 0, 0.05)) blur(1px);
}

@keyframes blob-float {
  0% {
    transform: translate(0, 0) scale(var(--base-scale));
  }
  50% {
    transform: translate(-10px, 15px) scale(calc(var(--base-scale) + 0.1));
  }
  100% {
    transform: translate(-5px, 25px) scale(calc(var(--base-scale) - 0.05));
  }
}
</style>
