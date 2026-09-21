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
 * 3. Отрисовка SVG. Для больших периодов контейнер расширяется, позволяя скроллить график по горизонтали.
 */
import { computed } from "vue";
import type { ChartDataPoint } from "~/composables/useAnalyticsData";
import { formatAmount } from "~/utils";

const props = defineProps<{
  data: ChartDataPoint[];
}>();

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

  return index % 5 === 0;
};

const svgWidth = 1000;
const svgHeight = 400;
const paddingY = 40; 
const paddingX = 25; 

const chartHeight = svgHeight - paddingY * 2;

const containerStyle = computed(() => {
  return {
    width: '100%',
    aspectRatio: `${svgWidth} / ${svgHeight}`
  };
});

const bars = computed(() => {
  if (maxVal.value === 0 || props.data.length === 0) return [];

  const len = props.data.length;
  const gap = len <= 7 ? 24 : len <= 31 ? 8 : 4;
  const totalGaps = (len - 1) * gap;
  const availableWidth = svgWidth - paddingX * 2;
  
  let barWidth = Math.max((availableWidth - totalGaps) / len, 2);
  
  // Ограничиваем ширину столбца, чтобы при 3-7 днях они не раздувались
  if (barWidth > 80) {
    barWidth = 80;
  }

  // Вычисляем реальную ширину всех столбцов для центрирования
  const actualTotalWidth = len * barWidth + totalGaps;
  const startX = (svgWidth - actualTotalWidth) / 2;

  return props.data.map((d, i) => {
    const height = (d.value / maxVal.value) * chartHeight;
    const x = startX + i * (barWidth + gap);
    const y = paddingY + chartHeight - height;

    const finalHeight = Math.max(height, 8);
    const finalY = height === 0 ? paddingY + chartHeight - 8 : y;

    return {
      ...d,
      x,
      y: finalY,
      width: barWidth,
      height: finalHeight,
      showLabel: shouldShowLabel(i, props.data.length, d.label),
    };
  });
});

const valueFontSize = computed(() => {
  const len = props.data.length;
  if (len <= 7) return 26;
  return 20;
});

const labelFontSize = computed(() => {
  const len = props.data.length;
  if (len <= 7) return 28;
  return 22;
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

    <div v-else class="w-full">
      <div class="relative w-full" :style="containerStyle">
        <svg
          class="absolute inset-0 w-full h-full overflow-visible"
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        >
        <g v-for="(bar, idx) in bars" :key="idx">
          <!-- Вся колба теперь собирается внутри одного CSS-контейнера -->
          <!-- foreignObject расширен на 20px по ширине и 30px по высоте, чтобы тень не обрезалась SVG-рамкой -->
          <foreignObject
            :x="bar.x - 10"
            :y="paddingY - 5"
            :width="bar.width + 20"
            :height="chartHeight + 30"
          >
            <div class="w-full h-full px-2.5 pt-1.25 pb-6.25">
              <div
                class="w-full h-full glass-flask relative overflow-hidden"
                style="border-radius: 35px 35px 15px 15px"
              >
                <!-- Основная заливка (жидкость) внутри колбы -->
                <div
                  class="absolute bottom-0 w-full liquid-gradient transition-all duration-500 ease-out flex flex-col"
                  :style="{
                    height: bar.height + 'px',
                    animationDelay: '-' + idx * 1 + 's',
                  }"
                >
                  <!-- Поверхность жидкости (мениск) -->
                  <div
                    class="w-full meniscus-gradient"
                    style="height: min(100%, 20px)"
                  />
                </div>

                <!-- Общий цилиндрический 3D блик на всю колбу (поверх жидкости) -->
                <div
                  class="absolute inset-0 glass-shine-gradient pointer-events-none"
                />
              </div>
            </div>
          </foreignObject>

          <!-- Значение сверху -->
          <text
            v-if="bar.value > 0 && (bars.length <= 7 || bar.value === maxVal)"
            :x="bar.x + bar.width / 2"
            :y="bar.y - 15"
            text-anchor="middle"
            fill="var(--color-text-primary)"
            :font-size="valueFontSize"
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
            :y="svgHeight - 10"
            text-anchor="middle"
            fill="var(--color-text-secondary)"
            :font-size="labelFontSize"
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

.glass-flask {
  background-color: rgba(255, 255, 255, 0.005);
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.7),
    0px 6px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
}

.liquid-gradient {
  background: linear-gradient(
    to right,
    var(--color-accent-end) 0%,
    var(--color-accent-mid) 20%,
    var(--color-accent-start) 46%,
    var(--color-accent-start) 52%,
    var(--color-accent-mid) 80%,
    var(--color-accent-end) 100%
  );

  /* Две маски: волна сверху (двухцикловый SVG) и сплошная заливка ниже волны */
  -webkit-mask-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 10' preserveAspectRatio='none'%3E%3Cpath d='M0,5 C8.3,10 16.6,10 25,5 C33.3,0 41.6,0 50,5 C58.3,10 66.6,10 75,5 C83.3,0 91.6,0 100,5 L100,10 L0,10 Z' fill='black'/%3E%3C/svg%3E"),
    linear-gradient(black, black);
  mask-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 10' preserveAspectRatio='none'%3E%3Cpath d='M0,5 C8.3,10 16.6,10 25,5 C33.3,0 41.6,0 50,5 C58.3,10 66.6,10 75,5 C83.3,0 91.6,0 100,5 L100,10 L0,10 Z' fill='black'/%3E%3C/svg%3E"),
    linear-gradient(black, black);

  -webkit-mask-size:
    300% 6px,
    100% calc(100% - 6px);
  mask-size:
    300% 6px,
    100% calc(100% - 6px);

  -webkit-mask-position:
    0% 0,
    0 6px;
  mask-position:
    0% 0,
    0 6px;

  -webkit-mask-repeat: repeat-x, no-repeat;
  mask-repeat: repeat-x, no-repeat;

  animation: wave-animation 3.5s linear infinite;
}

@keyframes wave-animation {
  0% {
    -webkit-mask-position:
      0% 0,
      0 5px;
    mask-position:
      0% 0,
      0 5px;
  }
  100% {
    -webkit-mask-position:
      75% 0,
      0 5px;
    mask-position:
      75% 0,
      0 5px;
  }
}

.meniscus-gradient {
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}

.glass-shine-gradient {
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0) 10%,
    rgba(255, 255, 255, 0) 90%,
    rgba(255, 255, 255, 0.3) 100%
  );
}
</style>
