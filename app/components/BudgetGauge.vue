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
}

const props = defineProps<Props>();

// --- Константы геометрии ---
const TOTAL_TILES = 20;
const TILE_STEP_DEG = 183 / (TOTAL_TILES - 1);
const TILE_RADIUS = 130;
const TILE_OUTER_RADIUS = TILE_RADIUS + 20; // 150px (внешний торец плашки)
const MARKER_TOP_OFFSET = 20; // Зазор над плашкой при 50%
const MARKER_SIDE_OFFSET = 27; // Вынос по бокам при 0%..5% и 100%

// Ограничиваем количество заполненных плиток строго от 0 до TOTAL_TILES (20)
const filledCount = computed(() => {
  const safePercent = Number.isFinite(props.percent) ? props.percent : 0;
  return Math.min(TOTAL_TILES, Math.max(0, Math.floor(safePercent / 5)));
});

// Процент для отображения: не выходит за пределы 0% и 100%
const displayPercent = computed(() => {
  const safePercent = Number.isFinite(props.percent) ? props.percent : 0;
  if (safePercent <= 0) return 0;
  if (safePercent >= 100) return 100;
  return filledCount.value * 5;
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
  return -90 + index * TILE_STEP_DEG;
}

function tileTransform(index: number): string {
  return `rotate(${tileAngle(index)}deg) translateY(-${TILE_RADIUS}px)`;
}

const markerStyle = computed(() => {
  const angle = tileAngle(activeTileIndex.value);
  const rad = (angle * Math.PI) / 180;

  // Динамический радиальный вынос: плавно интерполируем между верхним и боковыми положениями
  const radialOffset =
    MARKER_TOP_OFFSET * Math.abs(Math.cos(rad)) +
    MARKER_SIDE_OFFSET * Math.abs(Math.sin(rad));

  const radius = TILE_OUTER_RADIUS + radialOffset;

  const x = (radius * Math.sin(rad)).toFixed(2);
  const y = (-radius * Math.cos(rad)).toFixed(2);

  return {
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
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

  const start: RGBA = [245, 195, 145, 1];
  const mid: RGBA = [231, 86, 66, 1]; // --color-sunset-mid (#e75642)
  const end: RGBA = [219, 59, 53, 1]; // --color-sunset-orange (#db3b35)

  if (t < 0.65) {
    return interpolateColor(start, mid, t / 0.65);
  } else {
    return interpolateColor(mid, end, (t - 0.65) / 0.35);
  }
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="relative w-104 h-80 overflow-visible">
      <div class="absolute w-full h-85 left-0 top-0">
        <div
          v-for="(_, i) in TOTAL_TILES"
          :key="i"
          class="absolute left-1/2 top-1/2"
          :style="{ transform: tileTransform(i) }"
        >
          <div
            class="w-3.75 h-10 ml-[-7.5px] -mt-5 rounded-[5px] transition-all duration-500 ease-out"
            :class="i < filledCount ? 'shadow-none' : 'bg-milky'"
            :style="
              i < filledCount
                ? {
                    backgroundColor: getTileColor(i),
                    boxShadow: 'var(--shadow-sunset-glow)',
                  }
                : { boxShadow: 'var(--shadow-neu-inner)' }
            "
          />
        </div>

        <div
          v-if="markerStyle"
          class="absolute -translate-x-1/5 z-20 transition-all duration-500 ease-out pointer-events-none"
          :style="markerStyle"
        >
          <span class="text-sm font-extrabold text-text-accent">
            {{ displayPercent }}%
          </span>
        </div>

        <div class="flex flex-col items-center mt-25">
          <span
            class="text-text-accent text-xs font-bold uppercase tracking-wider mb-1"
          >
            Бюджет
          </span>
          <span
            class="text-text-primary text-4xl font-extrabold tracking-tight"
          >
            ${{ formatMoney(budget) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
