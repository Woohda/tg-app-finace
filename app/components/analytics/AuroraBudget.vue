<script setup lang="ts">
/**
 * @module app/components/analytics/AuroraBudget
 * @fileoverview Фоновое «дышащее» пятно Aurora с эффектом вдавленного текста процента
 * @description
 * Отображает анимированный радиальный градиент с динамическим цветом и прозрачным текстом процента
 * в стиле вдавленного в стекло контента (Glassmorphism).
 * Поддерживает два режима работы:
 * - `budget`: мониторинг освоения бюджета с 3 градациями цвета (мятный, персиковый, винный);
 * - `delta`: динамика изменения расходов с 2 цветами (винный красный при росте трат, мятный при снижении).
 * ---
 * ### Логика работы:
 * 1. В зависимости от режима `mode` вычисляет цвет светового пятна `blobColor`.
 * 2. Регулирует скорость пульсации (`animationDuration`) и масштаб пятна (`baseScale`) на основе значения `percent`.
 * 3. Отрисовывает аккуратный водяной знак процента в правом верхнем углу контейнера с учетом выбранного режима.
 */
import { computed } from "vue";

interface Props {
  percent: number;
  budget?: number;
  spent?: number;
  mode?: "budget" | "delta";
}

const props = withDefaults(defineProps<Props>(), {
  budget: 0,
  spent: 0,
  mode: "budget",
});

// Цвет зависит от процента
const blobColor = computed(() => {
  if (props.mode === "delta") {
    // Два цвета: красный винный и мятный
    return props.percent > 0
      ? "rgba(225, 29, 72, 0.55)" // Винный
      : "rgba(46, 213, 115, 0.45)"; // Мятный
  }

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
  if (props.mode === "delta") return 0.65;
  const p = props.percent;
  if (p < 50) return 0.9;
  if (p < 85) return 1.05;
  return 1.25;
});

const displayPercent = computed(() => {
  const rounded = Math.round(props.percent);
  if (props.mode === "delta" && rounded > 0) {
    return `+${rounded}`;
  }
  return String(rounded);
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
    <div
      class="absolute right-4 flex items-start pointer-events-none select-none"
      :class="mode === 'delta' ? 'top-4' : 'top-2'"
    >
      <span
        :class="[
          'font-extrabold tracking-tight leading-none glass-text',
          mode === 'delta' ? 'text-[48px]' : 'text-[80px]',
        ]"
        style="font-family: var(--font-sans)"
      >
        {{ displayPercent }}
      </span>
      <span
        :class="[
          'font-bold glass-text',
          mode === 'delta' ? 'text-2xl ml-px' : 'text-3xl ml-1',
        ]"
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

  filter: drop-shadow(1px 2px 4px rgba(0, 0, 0, 0.05)) blur(1.1px);
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
