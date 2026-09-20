<script setup lang="ts">
/**
 * @module app/components/dashboard/ExpensesDonut
 * @fileoverview Кольцевой график расходов с распределением по категориям (Top 5)
 * @description
 * Отображает общие расходы за месяц и пропорциональное кольцо по главным категориям трат.
 * Иконки (эмодзи) накладываются автоматически на каждый сегмент графика.
 * Общая сумма берется из мока (mockTotalExpense), но доли строятся локально (localTotal), чтобы всегда замыкать круг.
 * ---
 * ### Особенности:
 * - Стилистика: 3D Gummy/Plastic (эффект леденцов, цветные объемные тени)
 * - Резиновая (прогрессивная) ширина легенды с обрезанием длинного текста.
 * - Индивидуальные gap-отступы между SVG-кривыми с минимальной длиной сегмента.
 */
import { computed } from "vue";
import { formatAmount } from "~/utils";

import { ChartColumn } from "@lucide/vue";

export interface CategoryBudgetData {
  id: string;
  name: string;
  amount: number;
  color: string;
  icon: string | null;
}

const props = defineProps<{
  categories: CategoryBudgetData[];
  isLoading?: boolean;
  totalExpense?: number;
}>();

const radius = 67;
const circumference = 2 * Math.PI * radius;

const strokeWidth = 24;
const visualGap = 0.5;
const minDash = strokeWidth + visualGap;

const donutTotal = computed(() =>
  props.categories.reduce((acc, cat) => acc + cat.amount, 0),
);

const displayTotal = computed(() =>
  props.totalExpense !== undefined ? props.totalExpense : donutTotal.value,
);

const segments = computed(() => {
  const numCats = props.categories.length;
  if (numCats === 0) return [];

  const totalMinDash = numCats * minDash;
  const remainingCircumference = Math.max(0, circumference - totalMinDash);

  let accumulatedOffset = 0;

  // Масштабы для бликов и теней (чтобы они идеально совпадали с углом базового кольца)
  const scaleHighlight = 63 / radius;
  const scaleSharp = 59 / radius;
  const scaleShadow = 73 / radius;

  return props.categories.map((cat) => {
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
</script>

<template>
  <GlassCard>
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-xl font-extrabold text-text-primary">Расходы</h3>
      <NuxtLink
        to="/finreports"
        class="text-text-secondary a11y-focus rounded-md"
      >
        <ChartColumn :stroke-width="1.5" />
      </NuxtLink>
    </div>

    <TransitionGroup
      tag="div"
      name="layout"
      class="flex items-center w-full relative"
      :class="isLoading ? 'justify-center' : 'justify-start gap-5'"
    >
      <div key="donut" class="relative w-40 h-40 shrink-0 z-10">
        <!-- Состояние загрузки (Скелетон) -->
        <DonutSkeleton v-if="isLoading" />

        <!-- Загруженное состояние: Основной SVG и иконки -->
        <template v-else>
          <svg
            class="w-full h-full -rotate-90 transform overflow-visible"
            viewBox="0 0 160 160"
          >
            <defs>
              <filter id="blur-sm" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" />
              </filter>
              <filter id="blur-md" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
            </defs>

            <!-- Группа с отбрасываемой тенью -->
            <g style="filter: drop-shadow(0px 6px 8px rgba(0, 0, 0, 0.22))">
              <!-- 1. Базовые цветные сегменты -->
              <g>
                <circle
                  v-for="seg in segments"
                  :key="'base-' + seg.id"
                  cx="80"
                  cy="80"
                  :r="radius"
                  fill="none"
                  :stroke="seg.color"
                  :stroke-width="strokeWidth"
                  :stroke-dasharray="seg.strokeDasharray"
                  :stroke-dashoffset="seg.strokeDashoffset"
                  stroke-linecap="round"
                  class="transition-all duration-1000 ease-out"
                />
              </g>

              <!-- 2. Внешняя глубокая тень (эффект закругления края трубки) -->
              <g filter="url(#blur-md)">
                <circle
                  v-for="seg in segments"
                  :key="'shadow-' + seg.id"
                  cx="80"
                  cy="80"
                  :r="74"
                  fill="none"
                  stroke="black"
                  :stroke-width="8"
                  stroke-opacity="0.25"
                  :stroke-dasharray="seg.shadowDasharray"
                  :stroke-dashoffset="seg.shadowDashoffset"
                  stroke-linecap="round"
                  class="pointer-events-none transition-all duration-1000 ease-out"
                />
              </g>

              <!-- 3. Широкий мягкий блик (плавный переход объема) -->
              <g filter="url(#blur-md)">
                <circle
                  v-for="seg in segments"
                  :key="'high-' + seg.id"
                  cx="80"
                  cy="80"
                  :r="62"
                  fill="none"
                  stroke="white"
                  :stroke-width="4"
                  stroke-opacity="0.15"
                  :stroke-dasharray="seg.highlightDasharray"
                  :stroke-dashoffset="seg.highlightDashoffset"
                  stroke-linecap="round"
                  class="pointer-events-none transition-all duration-1000 ease-out"
                />
              </g>

              <!-- 4. Узкий резкий блик (эффект мокрого пластика/глянца) -->
              <g filter="url(#blur-sm)">
                <circle
                  v-for="seg in segments"
                  :key="'sharp-' + seg.id"
                  cx="80"
                  cy="80"
                  :r="59"
                  fill="none"
                  stroke="white"
                  :stroke-width="1"
                  stroke-opacity="0.25"
                  :stroke-dasharray="seg.sharpDasharray"
                  :stroke-dashoffset="seg.sharpDashoffset"
                  stroke-linecap="round"
                  class="pointer-events-none transition-all duration-1000 ease-out"
                />
              </g>
            </g>
          </svg>

          <div
            v-for="seg in segments"
            :key="'icon-' + seg.id"
            class="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
            :style="{
              left: `${seg.iconX}%`,
              top: `${seg.iconY}%`,
            }"
          >
            <component
              :is="seg.IconComponent"
              class="text-xs text-white"
              style="
                filter: drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.3));
                opacity: 1;
              "
            />
          </div>

          <Transition appear name="fade-in">
            <div
              class="absolute inset-0 flex flex-col items-center justify-center rounded-full"
            >
              <span class="text-xs text-text-secondary tracking-wider"
                >Потрачено</span
              >
              <span class="text-md font-extrabold text-text-primary">{{
                formatAmount(displayTotal)
              }}</span>
            </div>
          </Transition>
        </template>
      </div>

      <!-- Список категорий (Легенда) с анимацией появления -->
      <div
        v-if="!isLoading"
        key="legend"
        class="flex-1 flex flex-col justify-center gap-2 min-w-0"
      >
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-start gap-2.5"
        >
          <div
            class="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            :style="{
              backgroundColor: cat.color,
              boxShadow: `0 0 8px ${cat.color}80`,
            }"
          />
          <div class="flex flex-col gap-0.5 min-w-0">
            <span
              class="text-xs font-medium text-text-secondary truncate w-full"
            >
              {{ cat.name }}
            </span>
            <span class="text-xs font-bold text-text-primary">{{
              formatAmount(cat.amount)
            }}</span>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </GlassCard>
</template>

<style scoped>
/* FLIP-анимация для контейнера (donut + legend) */
.layout-move,
.layout-enter-active,
.layout-leave-active {
  transition:
    transform 1.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 1.5s ease-in-out;
}

.layout-enter-from,
.layout-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* При удалении элемента вынимаем его из потока, чтобы остальные могли плавно занять его место */
.layout-leave-active {
  position: absolute;
  right: 0;
  opacity: 0;
}

/* Анимация появления текста в центре кольца */
.fade-in-enter-active,
.fade-in-leave-active {
  transition: opacity 1.5s ease-in-out;
}
.fade-in-enter-from,
.fade-in-leave-to {
  opacity: 0;
}
</style>
