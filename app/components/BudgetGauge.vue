<script setup lang="ts">
/**
 * @module app/components/BudgetGauge
 * @fileoverview Неоморфный сегментированный датчик бюджета (полукольцо)
 * @description
 * 20 вдавленных плашечек по 5% каждая, расположенных полукольцом.
 * Заполненные сегменты — градиент sunset-glow, пустые — inset-тень.
 * У последнего заполненного сегмента отображается процент (rounded down).
 */

interface Props {
  percent: number;
  budget: number;
  spent?: number;
}

const props = withDefaults(defineProps<Props>(), {
  spent: 0,
});

// --- Константы геометрии ---
const TOTAL_TILES = 20;
const TILE_STEP_DEG = 180 / (TOTAL_TILES - 1);
const TILE_RADIUS = 105;

// Ограничиваем количество заполненных плиток строго от 0 до TOTAL_TILES (20)
const filledCount = computed(() => {
  const safePercent = Number.isFinite(props.percent) ? props.percent : 0;
  const step = 100 / TOTAL_TILES;
  return Math.min(TOTAL_TILES, Math.max(0, Math.floor(safePercent / step)));
});

// Процент для отображения: не выходит за пределы 0% и 100%
const displayPercent = computed(() => {
  const safePercent = Number.isFinite(props.percent) ? props.percent : 0;
  if (safePercent <= 0) return 0;
  if (safePercent >= 100) return 100;
  const step = 100 / TOTAL_TILES;
  return Math.round(filledCount.value * step);
});

// Индекс плитки, над которой расположен маркер:
// При 0% маркер остается над 0-й плиткой (начало шкалы, не пропадает)
// При 100% и выше маркер фиксируется над 19-й плиткой (конец шкалы)
// В остальных случаях — над последней заполненной
const activeTileIndex = computed(() => {
  if (filledCount.value === 0) return 0;
  return Math.min(TOTAL_TILES - 1, filledCount.value - 1);
});

function tileAngle(index: number): number {
  return -78 + index * TILE_STEP_DEG;
}

function tileTransform(index: number): string {
  return `rotate(${tileAngle(index)}deg) translateY(-${TILE_RADIUS}px)`;
}

// Радиус для расположения маркера внутри кольца (чуть меньше TILE_RADIUS)
const MARKER_INNER_RADIUS = TILE_RADIUS - 30;

const markerStyle = computed(() => {
  const angle = tileAngle(activeTileIndex.value);
  const rad = (angle * Math.PI) / 180;

  // Располагаем маркер на внутренней окружности
  const x = (MARKER_INNER_RADIUS * Math.sin(rad)).toFixed(2);
  const y = (-MARKER_INNER_RADIUS * Math.cos(rad)).toFixed(2);

  return {
    left: `calc(50% + ${x}px)`,
    top: `calc(56% + ${y}px)`,
  };
});

type RGBA = [number, number, number, number];

function interpolateColor(color1: RGBA, color2: RGBA, factor: number) {
  const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
  const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
  const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
  const a = (color1[3] + factor * (color2[3] - color1[3])).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function getTileColor(index: number) {
  const t = index / (TOTAL_TILES - 1);

  const start: RGBA = [255, 210, 170, 1]; // Светло-персиковый
  const mid: RGBA = [252, 120, 80, 1]; // Коралловый
  const end: RGBA = [220, 50, 40, 1]; // Насыщенный красный

  if (t < 0.35) {
    return interpolateColor(start, mid, t / 0.35);
  } else {
    return interpolateColor(mid, end, (t - 0.35) / 0.65);
  }
}
</script>

<template>
  <div class="flex flex-col items-center pointer-events-none">
    <div class="relative w-80 h-40 overflow-visible">
      <div class="absolute w-full h-40">
        <div
          v-for="(_, i) in TOTAL_TILES"
          :key="i"
          class="absolute left-1/2 top-1/2"
          :style="{ transform: tileTransform(i) }"
        >
          <div
            class="w-2.5 h-10 -ml-1 -mt-3.5 rounded-full transition-all duration-500 ease-out"
            :style="
              i < filledCount
                ? {
                    backgroundColor: getTileColor(i),
                    boxShadow: `0 0 8px ${getTileColor(i)}`,
                  }
                : {
                    backgroundColor: 'rgba(0, 0, 0, 0.06)',
                  }
            "
          />
        </div>

        <div
          v-if="markerStyle"
          class="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-500 ease-out pointer-events-none"
          :style="markerStyle"
        >
          <span class="text-xs font-bold text-text-accent">
            {{ displayPercent }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
