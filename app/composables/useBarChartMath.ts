import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type { ChartDataPoint } from "~/utils/analytics";
import { formatAmount } from "~/utils/format";
import { flaskPath, liquidWavePath } from "~/utils/svgPaths";

export interface BarItem extends ChartDataPoint {
  x: number;
  y: number;
  width: number;
  height: number;
  waveLength: number;
  flaskD: string;
  waveLiquidD: string;
  showLabel: boolean;
  formattedValue: string;
  textX: number;
  textY: number;
  textAnchor: "middle" | "start" | "end";
}

export interface YAxisTick {
  fraction: number;
  y: number;
  topPercent: number;
  label: string;
  isBase: boolean;
}

/**
 * @module app/composables/useBarChartMath
 * @fileoverview Логика вычисления параметров для столбчатого графика расходов.
 * @description
 * Этот composable вынесен из AnalyticsBarChart.vue для декомпозиции компонента.
 * Рассчитывает геометрические параметры баров (колб), масштабирование значений,
 * адаптивные отступы, прореживание дат и деления оси Y.
 * ---
 * ### Логика работы:
 * 1. Расчет максимального значения и делений оси Y с шагом 20%.
 * 2. Вычисление размеров, отступов и формы колб с волновыми масками.
 * 3. Адаптивное прореживание подписей дат и позиционирование плавающих значений.
 */
export const useBarChartMath = (data: MaybeRefOrGetter<ChartDataPoint[]>) => {
  const points = computed(() => toValue(data) || []);

  const svgWidth = 1000;
  const svgHeight = 400;
  const paddingTop = 35; // запас сверху для чисел над максимальными столбцами
  const paddingBottom = 40; // запас снизу для дат
  const paddingX = 14; // симметричный боковой отступ для столбцов внутри графика

  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = computed(() => {
    if (points.value.length === 0) return 0;
    return Math.max(...points.value.map((d) => d.value));
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

  const formatY = (val: number): string => {
    if (val <= 0) return "0 ₽";
    if (val >= 1_000_000) {
      const m = (val / 1_000_000).toFixed(1).replace(".0", "");
      return `${m}М ₽`;
    }
    if (val >= 10_000) {
      const k = Math.round(val / 1000);
      return `${k}к ₽`;
    }
    if (val >= 1_000) {
      const k = (val / 1000).toFixed(1).replace(".0", "");
      return `${k}к ₽`;
    }
    return `${Math.round(val)} ₽`;
  };

  // 6 делений с шагом 20%: 100%, 80%, 60%, 40%, 20%, 0%
  const steps = [1, 0.8, 0.6, 0.4, 0.2, 0];

  const yAxisTicks = computed<YAxisTick[]>(() => {
    const max = maxVal.value;

    return steps.map((fraction) => {
      const y = paddingTop + chartHeight * (1 - fraction);
      const topPercent = (y / svgHeight) * 100;
      const value = max * fraction;
      const label = fraction === 0 ? "0 ₽" : formatY(value);

      return {
        fraction,
        y,
        topPercent,
        label,
        isBase: fraction === 0,
      };
    });
  });

  const valueFontSize = computed(() => {
    const len = points.value.length;
    if (len < 7) return 30;
    if (len === 7) return 18;
    return 20;
  });

  const labelFontSize = computed(() => {
    const len = points.value.length;
    if (len < 7) return 32;
    if (len === 7) return 24;
    return 23;
  });

  const bars = computed<BarItem[]>(() => {
    if (maxVal.value === 0 || points.value.length === 0) return [];

    const len = points.value.length;

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

    return points.value.map((d, i) => {
      const height = (d.value / maxVal.value) * chartHeight;
      const x = paddingX + i * (barWidth + gap);

      // Делаем минимальную высоту, чтобы даже пустые дни были видны как точки/деревяшки
      const finalHeight = Math.max(height, 8);
      const finalY =
        height === 0
          ? paddingTop + chartHeight - 8
          : paddingTop + chartHeight - height;

      const formattedValue = formatAmount(d.value);
      const approxTextWidth =
        formattedValue.length * (valueFontSize.value * 0.58);
      const approxHalfWidth = approxTextWidth / 2;

      let textX = x + barWidth / 2;
      let textAnchor: "middle" | "start" | "end" = "middle";

      if (textX - approxHalfWidth < paddingX) {
        textAnchor = "start";
        textX = Math.max(paddingX, x);
      } else if (textX + approxHalfWidth > svgWidth - paddingX) {
        textAnchor = "end";
        textX = Math.min(svgWidth - paddingX, x + barWidth);
      }

      return {
        ...d,
        x,
        y: finalY,
        width: barWidth,
        height: finalHeight,
        waveLength,
        flaskD: flaskPath(x, paddingTop, barWidth, chartHeight, rTop, rBot),
        waveLiquidD: liquidWavePath(
          x,
          finalY,
          barWidth,
          paddingTop + chartHeight,
          waveAmp,
          waveLength,
        ),
        showLabel: shouldShowLabel(i, points.value.length, d.label),
        formattedValue,
        textX,
        textY: finalY - 14,
        textAnchor,
      };
    });
  });

  // Отфильтрованные списки значений и лейблов (без смешивания v-for и v-if)
  const visibleValues = computed(() =>
    bars.value.filter(
      (bar) =>
        bar.value > 0 && (bars.value.length <= 7 || bar.value === maxVal.value),
    ),
  );

  const visibleLabels = computed(() =>
    bars.value.filter((bar) => bar.showLabel),
  );

  return {
    svgWidth,
    svgHeight,
    paddingTop,
    paddingBottom,
    paddingX,
    chartHeight,
    maxVal,
    yAxisTicks,
    bars,
    visibleValues,
    visibleLabels,
    valueFontSize,
    labelFontSize,
  };
};
