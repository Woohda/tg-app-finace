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

type ViewMode = "budget" | "spent";
const viewMode = ref<ViewMode>("budget");

const currentAmount = computed(() =>
  viewMode.value === "budget" ? props.budget : props.spent,
);

const currentLabel = computed(() =>
  viewMode.value === "budget" ? "Бюджет" : "Потрачено",
);

// --- Константы геометрии ---
const TOTAL_TILES = 20;
const TILE_STEP_DEG = 183 / (TOTAL_TILES - 1);
const TILE_RADIUS = 120;
const TILE_OUTER_RADIUS = TILE_RADIUS + 20; // 150px (внешний торец плашки)
const MARKER_TOP_OFFSET = 35; // Зазор над плашкой при 50%
const MARKER_SIDE_OFFSET = 22; // Вынос по бокам при 0%..5% и 100%

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
  const y = Math.min(0, -radius * Math.cos(rad)).toFixed(2);

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
  const mid: RGBA = [231, 86, 66, 1]; // --color-accent-mid (#e75642)
  const end: RGBA = [219, 59, 53, 1]; // --color-accent-end (#db3b35)

  if (t < 0.75) {
    return interpolateColor(start, mid, t / 0.75);
  } else {
    return interpolateColor(mid, end, (t - 0.75) / 0.25);
  }
}
</script>

<template>
  <div class="flex flex-col items-center pointer-events-none">
    <div class="relative w-90 h-45 overflow-visible">
      <div class="absolute w-full h-75 -left-1.5 top-0">
        <div
          v-for="(_, i) in TOTAL_TILES"
          :key="i"
          class="absolute left-1/2 top-1/2"
          :style="{ transform: tileTransform(i) }"
        >
          <div
            class="w-3.75 h-10 -ml-2 -mt-5 rounded-[5px] transition-all duration-500 ease-out"
            :class="i < filledCount ? 'shadow-none' : 'glass-milky'"
            :style="
              i < filledCount
                ? {
                    backgroundColor: getTileColor(i),
                    boxShadow: 'var(--shadow-accent-glow)',
                  }
                : { boxShadow: 'var(--shadow-glass-inner)' }
            "
          />
        </div>

        <div
          v-if="markerStyle"
          class="absolute -translate-x-1/5 translate-y-3.5 z-20 transition-all duration-500 ease-out pointer-events-none"
          :style="markerStyle"
        >
          <span class="text-xs font-extrabold text-text-accent">
            {{ displayPercent }}%
          </span>
        </div>

        <div
          class="flex flex-col items-center mt-24 ml-2.5 pointer-events-auto"
        >
          <span
            class="text-text-accent text-xs font-bold uppercase tracking-wider cursor-pointer select-none"
            @click="viewMode = viewMode === 'budget' ? 'spent' : 'budget'"
          >
            {{ currentLabel }}
          </span>
          <span
            class="text-text-primary text-3xl font-extrabold tracking-tight cursor-pointer select-none transition-all duration-200"
            @click="viewMode = viewMode === 'budget' ? 'spent' : 'budget'"
          >
            {{ formatAmount(currentAmount) }}
          </span>

          <!-- Переключатель режима: Бюджет / Потрачено -->
          <GlassSegmentedControl
            v-model="viewMode"
            :options="[
              { id: 'budget', label: 'Бюджет' },
              { id: 'spent', label: 'Потрачено' },
            ]"
            size="sm"
            class="mt-2"
          />
        </div>
      </div>
    </div>
  </div>
</template>
