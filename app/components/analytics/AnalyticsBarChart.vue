<script setup lang="ts">
/**
 * @module app/components/analytics/AnalyticsBarChart
 * @fileoverview Столбчатый график трат
 * @description
 * Отображает динамику расходов в виде вертикальных стеклянных колб с жидкостью.
 * Разделен на 2 колонки грида: ось Y с процентными делениями и SVG-график.
 * Вся математика, геометрия баров и шкала вынесены в composable useBarChartMath.
 */
import type { ChartDataPoint } from "~/utils/analytics";

const props = defineProps<{
  data: ChartDataPoint[];
}>();

const uid = useId();

const {
  svgWidth,
  svgHeight,
  paddingTop,
  chartHeight,
  maxVal,
  yAxisTicks,
  bars,
  visibleValues,
  visibleLabels,
  valueFontSize,
  labelFontSize,
} = useBarChartMath(() => props.data);
</script>

<template>
  <div class="w-full relative select-none">
    <div
      v-if="data.length === 0"
      class="flex items-center justify-center h-11 text-text-secondary text-sm"
    >
      Нет данных за этот период
    </div>

    <!-- Грид сетка: 1-й столбец — ось Y, 2-й столбец — график -->
    <div
      v-else
      class="w-full grid grid-cols-[max-content_1fr] items-stretch aspect-2.5/1 select-none"
    >
      <!-- Первый столбец: Ось Y -->
      <div class="relative h-full select-none flex flex-col justify-between">
        <!-- Невидимый распорочный блок для автоматического расчета ширины под самый длинный текст -->
        <div
          class="invisible pointer-events-none h-0 overflow-hidden flex flex-col items-end text-right text-[5px] font-semibold"
          aria-hidden="true"
        >
          <span v-for="tick in yAxisTicks" :key="'sp-' + tick.fraction">
            {{ tick.label }}
          </span>
        </div>

        <!-- Лейблы оси Y (шаг 20%, выравнивание по правому краю) -->
        <span
          v-for="tick in yAxisTicks"
          :key="'tick-' + tick.fraction"
          class="absolute right-1/8 -translate-y-1/2 text-right text-[6px] text-text-secondary whitespace-nowrap transition-colors"
          :style="{ top: `${tick.topPercent}%` }"
        >
          {{ tick.label }}
        </span>
      </div>

      <!-- Второй столбец: График (SVG) -->
      <div class="relative w-full h-full min-w-0 overflow-visible">
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
              <stop
                offset="45%"
                style="stop-color: var(--color-accent-start)"
              />
              <stop
                offset="55%"
                style="stop-color: var(--color-accent-start)"
              />
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

          <!-- Направляющие сетки и деления оси Y (шаг 20%) -->
          <g v-if="maxVal > 0" class="chart-grid">
            <!-- Горизонтальные направляющие -->
            <line
              v-for="tick in yAxisTicks"
              :key="'line-' + tick.fraction"
              x1="0"
              :y1="tick.y"
              :x2="svgWidth"
              :y2="tick.y"
              stroke="var(--color-text-secondary)"
              :stroke-opacity="tick.isBase ? 0.2 : 0.12"
              :stroke-width="tick.isBase ? 1.5 : 1"
              :stroke-dasharray="tick.isBase ? undefined : '4 6'"
              :stroke-linecap="tick.isBase ? 'round' : undefined"
            />

            <!-- Вертикальная линия оси Y -->
            <line
              x1="0"
              :y1="paddingTop"
              x2="0"
              :y2="paddingTop + chartHeight"
              stroke="var(--color-text-secondary)"
              stroke-opacity="0.2"
              stroke-width="1.5"
              stroke-linecap="round"
            />

            <!-- Насечки (ticks) на оси Y -->
            <line
              v-for="tick in yAxisTicks"
              :key="'tick-' + tick.fraction"
              x1="-4"
              :y1="tick.y"
              x2="0"
              :y2="tick.y"
              stroke="var(--color-text-secondary)"
              stroke-opacity="0.3"
              stroke-width="1.5"
            />
          </g>

          <g v-for="(bar, idx) in bars" :key="'bar-' + idx">
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
                :height="paddingTop + chartHeight - bar.y + 5"
                :fill="`url(#${uid}-liquid)`"
                :mask="`url(#${uid}-wmask-${idx})`"
              />
            </g>

            <!-- Стеклянный блик поверх всего -->
            <path :d="bar.flaskD" :fill="`url(#${uid}-shine)`" />
          </g>

          <!-- Значения сверху: отрисовываются поверх всех колб, не перекрываются соседними барами -->
          <g class="chart-values">
            <text
              v-for="(bar, idx) in visibleValues"
              :key="'val-' + idx"
              :x="bar.textX"
              :y="bar.textY"
              :text-anchor="bar.textAnchor"
              fill="var(--color-text-primary)"
              :style="{ fontSize: valueFontSize + 'px' }"
              font-weight="bold"
              font-family="var(--font-sans)"
              class="glass-text transition-all duration-500 ease-out"
            >
              {{ bar.formattedValue }}
            </text>
          </g>

          <!-- Лейблы снизу (даты) -->
          <g class="chart-labels">
            <text
              v-for="(bar, idx) in visibleLabels"
              :key="'lbl-' + idx"
              :x="bar.x + bar.width / 2"
              :y="svgHeight - 6"
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
  </div>
</template>

<style scoped>
.glass-text {
  filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2));
}
</style>
