/**
 * @module app/composables/useDonutMath
 * @fileoverview Логика вычисления параметров для SVG-графика кольца.
 * @description
 * Этот composable вынесен из ExpensesDonut.vue для упрощения компонента.
 * Он вычисляет длины линий, смещения и позиционирование иконок для
 * 3D-графика (эффект леденцов).
 * ---
 * ### Логика работы:
 * 1. Расчет длины каждого сегмента на основе переданной общей суммы.
 * 2. Вычисление `stroke-dasharray` и `stroke-dashoffset` для основного контура, бликов и теней.
 * 3. Расчет X/Y координат для позиционирования иконки по центру сегмента.
 */
import { computed, type Ref } from "vue";
import type { CategoryBudgetData } from "~/components/dashboard/ExpensesDonut.vue";

export const useDonutMath = (
  categories: Ref<CategoryBudgetData[]>,
  donutTotal: Ref<number>,
) => {
  const radius = 67;
  const circumference = 2 * Math.PI * radius;

  const strokeWidth = 24;
  const visualGap = 0.5;
  const minDash = strokeWidth + visualGap;

  const segments = computed(() => {
    const numCats = categories.value.length;
    if (numCats === 0) return [];

    const totalMinDash = numCats * minDash;
    const remainingCircumference = Math.max(0, circumference - totalMinDash);

    let accumulatedOffset = 0;

    // Масштабы для бликов и теней (чтобы они идеально совпадали с углом базового кольца)
    const scaleHighlight = 63 / radius;
    const scaleSharp = 59 / radius;
    const scaleShadow = 73 / radius;

    return categories.value.map((cat) => {
      const fraction =
        donutTotal.value > 0 ? cat.amount / donutTotal.value : 1 / numCats;
      const dashLength = minDash + fraction * remainingCircumference;
      const visibleLength = Math.max(0, dashLength - minDash);

      const strokeDasharray = `${visibleLength} ${circumference}`;
      const strokeDashoffset = -accumulatedOffset;

      // Смещения для 3D бликов и теней
      const highlightDasharray = `${visibleLength * scaleHighlight} ${circumference * scaleHighlight}`;
      const highlightDashoffset = -accumulatedOffset * scaleHighlight;

      const sharpDasharray = `${visibleLength * scaleSharp} ${circumference * scaleSharp}`;
      const sharpDashoffset = -accumulatedOffset * scaleSharp;

      const shadowDasharray = `${visibleLength * scaleShadow} ${circumference * scaleShadow}`;
      const shadowDashoffset = -accumulatedOffset * scaleShadow;

      const midAngle = (accumulatedOffset + visibleLength / 2) / radius;
      const pxX = 80 + radius * Math.sin(midAngle);
      const pxY = 80 - radius * Math.cos(midAngle);

      accumulatedOffset += dashLength;

      return {
        ...cat,
        strokeDasharray,
        strokeDashoffset,
        highlightDasharray,
        highlightDashoffset,
        sharpDasharray,
        sharpDashoffset,
        shadowDasharray,
        shadowDashoffset,
        iconX: Number(((pxX / 160) * 100).toFixed(2)),
        iconY: Number(((pxY / 160) * 100).toFixed(2)),
        IconComponent: useCategoryIcon(cat.icon || "❔"),
      };
    });
  });

  return {
    segments,
    radius,
    strokeWidth,
  };
};
