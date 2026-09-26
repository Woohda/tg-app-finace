<script setup lang="ts">
/**
 * @module app/components/analytics/AnalyticsBarChart
 * @fileoverview Столбчатый график трат
 * @description
 * Отображает динамику расходов в виде вертикальных столбцов.
 * Автоматически масштабируется по максимальному значению.
 * Отрисовывается с помощью SVG для создания 3D glass-эффекта.
 * ---
 * ### Логика работы:
 * 1. Получение массива точек {label, value}.
 * 2. Поиск максимального значения для расчета высоты баров (в процентах).
 * 3. Отрисовка SVG. Подписи скрываются, если их слишком много (например, для 1М).
 */
import { computed } from "vue";
import type { ChartDataPoint } from "~/utils/analytics";
import { formatAmount } from "~/utils/format";

const props = defineProps<{
  data: ChartDataPoint[];
}>();

const uid = useId();

const maxVal = computed(() => {
  if (!props.data || props.data.length === 0) return 0;
  return Math.max(...props.data.map((d) => d.value));
});

// Для длинных периодов подписи могут слипаться, поэтому прореживаем их
const shouldShowLabel = (index: number, total: number, label: string) => {
  if (total <= 7) return true; // Для недели показываем все

  if (total <= 31) {
    // Для месяца показываем строго 1, 5, 10, 15, 20, 25, 30 числа
    const day = parseInt(label.split(" ")[0] || "0", 10);
    return [1, 5, 10, 15, 20, 25, 30].includes(day);
  }

  // Для 3 месяцев и больше
  return index % 5 === 0;
};

const svgWidth = 1000;
const svgHeight = 400;
const paddingY = 40; // место под числа сверху и лейблы снизу
const paddingX = 25; // место по бокам, чтобы крайние лейблы не обрезались

const chartHeight = svgHeight - paddingY * 2;

const bars = computed(() => {
  if (maxVal.value === 0 || props.data.length === 0) return [];

  const len = props.data.length;

  // Динамический отступ между барами в зависимости от периода
  // Для недели (<=7) - отступы большие, для месяца (<=31) - поменьше, чтобы колбы были шире
  const gap = len <= 7 ? 16 : len <= 31 ? 6 : 3;

  const totalGaps = (len - 1) * gap;
  const availableWidth = svgWidth - paddingX * 2;
  const barWidth = Math.max((availableWidth - totalGaps) / len, 2);

  // Радиусы скругления — пропорциональны ширине столбца
  const rTop = Math.min(40, barWidth * 0.4);
  const rBot = Math.min(15, barWidth * 0.2);

  // Параметры волны
  let waveAmp = 4;
  let waveLength = barWidth;

  if (len < 7) {
    // 3 месяца (3 очень широких столбца)
    waveAmp = 10;
    waveLength = barWidth * 2;
  } else if (len === 7) {
    // Неделя (7 столбцов)
    waveAmp = 5;
    waveLength = barWidth * 1.2;
  } else {
    // Месяц (~30 узких столбцов)
    waveAmp = 2;
    waveLength = 50;
  }

  return props.data.map((d, i) => {
    const height = (d.value / maxVal.value) * chartHeight;
    const x = paddingX + i * (barWidth + gap);

    // Делаем минимальную высоту, чтобы даже пустые дни были видны как точки/деревяшки
    const finalHeight = Math.max(height, 8);
    const finalY =
      height === 0
        ? paddingY + chartHeight - 8
        : paddingY + chartHeight - height;

    return {
      ...d,
      x,
      y: finalY,
      width: barWidth,
      height: finalHeight,
      waveLength, // прокидываем для анимации
      flaskD: flaskPath(x, paddingY, barWidth, chartHeight, rTop, rBot),
      waveLiquidD: liquidWavePath(
        x,
        finalY,
        barWidth,
        paddingY + chartHeight,
        waveAmp,
        waveLength,
      ),
      showLabel: shouldShowLabel(i, props.data.length, d.label),
    };
  });
});

const valueFontSize = computed(() => {
  const len = props.data.length;
  if (len < 7) return 30;
  if (len === 7) return 18;
  return 20;
});

const labelFontSize = computed(() => {
  const len = props.data.length;
  if (len < 7) return 32;
  if (len === 7) return 24;
  return 23;
});
</script>

<template>
  <div class="w-full relative select-none">
    <div
      v-if="data.length === 0"
      class="flex items-center justify-center h-48 text-text-secondary text-sm"
    >
      Нет данных за этот период
    </div>

    <div v-else class="w-full overflow-hidden aspect-2.5/1">
      <svg
        class="w-full h-full overflow-visible"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        preserveAspectRatio="none"
        role="img"
        aria-label="Столбчатый график расходов"
      >
        <defs>
          <!-- Градиент жидкости (горизонтальный) -->
          <linearGradient :id="uid + '-liquid'" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style="stop-color: var(--color-accent-end)" />
            <stop offset="25%" style="stop-color: var(--color-accent-mid)" />
            <stop offset="45%" style="stop-color: var(--color-accent-start)" />
            <stop offset="55%" style="stop-color: var(--color-accent-start)" />
            <stop offset="75%" style="stop-color: var(--color-accent-mid)" />
            <stop offset="100%" style="stop-color: var(--color-accent-end)" />
          </linearGradient>

          <!-- Стеклянный блик (вертикальные полосы по бокам колбы) -->
          <linearGradient :id="uid + '-shine'" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="white" stop-opacity="0.4" />
            <stop offset="10%" stop-color="white" stop-opacity="0" />
            <stop offset="90%" stop-color="white" stop-opacity="0" />
            <stop offset="100%" stop-color="white" stop-opacity="0.25" />
          </linearGradient>

          <!-- Фон стеклянной колбы (вертикальный, сверху светлее) -->
          <linearGradient :id="uid + '-flask'" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="white" stop-opacity="0.001" />
            <stop offset="100%" stop-color="white" stop-opacity="0.05" />
          </linearGradient>

          <!-- Маски обрезки по форме колбы -->
          <clipPath
            v-for="(bar, idx) in bars"
            :id="uid + '-clip-' + idx"
            :key="'clip-' + idx"
          >
            <path :d="bar.flaskD" />
          </clipPath>

          <!-- Волновые маски per-bar (анимированный волнистый край жидкости) -->
          <mask
            v-for="(bar, idx) in bars"
            :id="uid + '-wmask-' + idx"
            :key="'wmask-' + idx"
          >
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                :values="`0 0; ${-bar.waveLength} 0`"
                dur="4s"
                repeatCount="indefinite"
                :begin="`${-idx}s`"
              />
              <path :d="bar.waveLiquidD" fill="white" />
            </g>
          </mask>
        </defs>

        <g v-for="(bar, idx) in bars" :key="idx">
          <!-- Мягкая тень под колбой -->
          <path
            :d="bar.flaskD"
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            stroke-width="6"
          />

          <!-- Фон колбы (стекло) -->
          <path
            :d="bar.flaskD"
            :fill="`url(#${uid}-flask)`"
            stroke="rgba(255,255,255,0.005)"
            stroke-width="1.5"
          />

          <!-- Внутренний блик (верхний край колбы, имитация box-shadow inset) -->
          <path
            :d="bar.flaskD"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            stroke-width="2"
            :clip-path="`url(#${uid}-clip-${idx})`"
          />

          <!-- Заливка жидкости: статичный rect с градиентом + анимированная волновая маска -->
          <g :clip-path="`url(#${uid}-clip-${idx})`">
            <!-- Статичный rect с градиентом (не двигается) -->
            <rect
              :x="bar.x"
              :y="bar.y - 5"
              :width="bar.width"
              :height="paddingY + chartHeight - bar.y + 5"
              :fill="`url(#${uid}-liquid)`"
              :mask="`url(#${uid}-wmask-${idx})`"
            />
          </g>

          <!-- Стеклянный блик поверх всего -->
          <path :d="bar.flaskD" :fill="`url(#${uid}-shine)`" />

          <!-- Значение сверху -->
          <text
            v-if="bar.value > 0 && (bars.length <= 7 || bar.value === maxVal)"
            :x="bar.x + bar.width / 2"
            :y="bar.y - 15"
            text-anchor="middle"
            fill="var(--color-text-primary)"
            :style="{ fontSize: valueFontSize + 'px' }"
            font-weight="bold"
            font-family="var(--font-sans)"
            class="glass-text transition-all duration-500 ease-out"
          >
            {{ formatAmount(bar.value) }}
          </text>

          <!-- Лейбл снизу (дата) -->
          <text
            v-if="bar.showLabel"
            :x="bar.x + bar.width / 2"
            :y="svgHeight - 3"
            text-anchor="middle"
            fill="var(--color-text-secondary)"
            :style="{ fontSize: labelFontSize + 'px' }"
            font-family="var(--font-sans)"
          >
            {{ bar.label }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.glass-text {
  filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2));
}
</style>
