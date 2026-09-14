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
import { mockTotalExpense } from "~/mocks/dashboard";
import { ChartColumn } from "@lucide/vue";
import GlassCard from "~/components/GlassCard.vue";
import DonutSkeleton from "./DonutSkeleton.vue";

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
}>();

const radius = 67;
const circumference = 2 * Math.PI * radius;

const strokeWidth = 24;
const visualGap = 0;
const minDash = strokeWidth + visualGap;

const localTotal = computed(() =>
  props.categories.reduce((acc, cat) => acc + cat.amount, 0),
);

const segments = computed(() => {
  const numCats = props.categories.length;
  if (numCats === 0) return [];

  const totalMinDash = numCats * minDash;
  const remainingCircumference = Math.max(0, circumference - totalMinDash);

  let accumulatedOffset = 0;

  return props.categories.map((cat) => {
    const fraction =
      localTotal.value > 0 ? cat.amount / localTotal.value : 1 / numCats;
    const dashLength = minDash + fraction * remainingCircumference;
    const visibleLength = Math.max(0, dashLength - minDash);

    const strokeDasharray = `${visibleLength} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;

    const midAngle =
      ((accumulatedOffset + visibleLength / 2) / circumference) * 2 * Math.PI;
    const pxX = 80 + radius * Math.sin(midAngle);
    const pxY = 80 - radius * Math.cos(midAngle);

    accumulatedOffset += dashLength;

    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
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
      <NuxtLink to="/finreports" class="text-text-secondary">
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
              <filter
                id="glossy-volumetric"
                x="-30%"
                y="-30%"
                width="160%"
                height="160%"
              >
                <!-- 1. Яркая цветная внешняя тень -->
                <!-- Создает красивую светящуюся тень, используя собственные цвета графики -->
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="6"
                  result="coloredBlur"
                />
                <feOffset
                  dx="0"
                  dy="2"
                  in="coloredBlur"
                  result="coloredOffset"
                />
                <feComponentTransfer in="coloredOffset" result="coloredShadow">
                  <feFuncA type="linear" slope="0.1" />
                </feComponentTransfer>

                <!-- 2. Мягкая внешняя тень (для глубины) -->
                <feDropShadow
                  in="SourceAlpha"
                  dx="0"
                  dy="2"
                  stdDeviation="6"
                  flood-color="rgba(0,0,0,0.1)"
                  result="drop"
                />

                <!-- 3. Мягкая внутренняя тень (Справа снизу) для 3D объема -->
                <feGaussianBlur
                  in="SourceAlpha"
                  stdDeviation="5"
                  result="blurDark"
                />
                <feOffset dx="2" dy="2" in="blurDark" result="offsetBlurDark" />
                <feComposite
                  in="SourceAlpha"
                  in2="offsetBlurDark"
                  operator="out"
                  result="shadowArea"
                />
                <feFlood
                  flood-color="#000000"
                  flood-opacity="0.1"
                  result="shadowColor"
                />
                <feComposite
                  in="shadowColor"
                  in2="shadowArea"
                  operator="in"
                  result="innerShadow"
                />

                <!-- 4. Мягкий внутренний блик (Слева сверху) для 3D объема -->
                <feGaussianBlur
                  in="SourceAlpha"
                  stdDeviation="4"
                  result="blurLight"
                />
                <feOffset
                  dx="-3"
                  dy="-3"
                  in="blurLight"
                  result="offsetBlurLight"
                />
                <feComposite
                  in="SourceAlpha"
                  in2="offsetBlurLight"
                  operator="out"
                  result="highlightArea"
                />
                <feFlood
                  flood-color="#ffffff"
                  flood-opacity="0.3"
                  result="highlightColor"
                />
                <feComposite
                  in="highlightColor"
                  in2="highlightArea"
                  operator="in"
                  result="highlight"
                />

                <!-- 5. Четкий внутренний контурный свет (Слева сверху) для стеклянного края -->
                <feGaussianBlur
                  in="SourceAlpha"
                  stdDeviation="0.9"
                  result="sharpBlur"
                />
                <feOffset dx="-1" dy="-1" in="sharpBlur" result="sharpOffset" />
                <feComposite
                  in="SourceAlpha"
                  in2="sharpOffset"
                  operator="out"
                  result="sharpHighlightArea"
                />
                <feFlood
                  flood-color="#ffffff"
                  flood-opacity="0.6"
                  result="sharpHighlightColor"
                />
                <feComposite
                  in="sharpHighlightColor"
                  in2="sharpHighlightArea"
                  operator="in"
                  result="sharpHighlight"
                />

                <!-- 6. Тонкая обводка по всему контуру (Очень мягкая) -->
                <feMorphology
                  in="SourceAlpha"
                  operator="erode"
                  radius="0.9"
                  result="eroded"
                />
                <feComposite
                  in="SourceAlpha"
                  in2="eroded"
                  operator="out"
                  result="rimArea"
                />
                <feFlood
                  flood-color="#ffffff"
                  flood-opacity="0.9"
                  result="rimColor"
                />
                <feComposite
                  in="rimColor"
                  in2="rimArea"
                  operator="in"
                  result="rimHighlight"
                />

                <!-- Объединяем все слои -->
                <feMerge>
                  <feMergeNode in="coloredShadow" />
                  <feMergeNode in="drop" />
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode in="innerShadow" />
                  <feMergeNode in="highlight" />
                  <feMergeNode in="sharpHighlight" />
                </feMerge>
              </filter>
            </defs>

            <circle
              v-for="seg in segments"
              :key="seg.id"
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
              filter="url(#glossy-volumetric)"
            />
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
              class="text-sm text-white"
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
                formatAmount(mockTotalExpense)
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
    transform 1.7s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 1.7s ease-in-out;
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
  transition: opacity 1.7s ease-in-out;
}
.fade-in-enter-from,
.fade-in-leave-to {
  opacity: 0;
}
</style>
