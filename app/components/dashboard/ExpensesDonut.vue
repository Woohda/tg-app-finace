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
 * ---
 * ### Логика работы:
 * 1. Получение категорий и общей суммы расходов через пропсы.
 * 2. Передача данных в `useDonutMath` для вычисления SVG-кривых.
 * 3. Отрисовка SVG кольца, бликов и теней на основе вычисленных данных.
 */
import { computed } from "vue";
import { formatAmount } from "~/utils/format";

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

const categoriesRef = computed(() => props.categories);

const donutTotal = computed(() =>
  props.categories.reduce((acc, cat) => acc + cat.amount, 0),
);

const displayTotal = computed(() =>
  props.totalExpense !== undefined ? props.totalExpense : donutTotal.value,
);

const { segments, radius, strokeWidth } = useDonutMath(
  categoriesRef,
  donutTotal,
);
</script>

<template>
  <GlassCard>
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-xl font-extrabold text-text-primary">Расходы</h2>
      <NuxtLink
        to="/analytics"
        aria-label="Подробная аналитика расходов"
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
            role="img"
            aria-label="Диаграмма расходов по категориям"
          >
            <defs>
              <filter
                id="glass-inset"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <!-- border: 0.7px solid rgba(255, 255, 255, 0.4) -->
                <feMorphology
                  operator="dilate"
                  radius="0.7"
                  in="SourceAlpha"
                  result="dilated"
                />
                <feComposite
                  operator="out"
                  in="dilated"
                  in2="SourceAlpha"
                  result="border-mask"
                />
                <feFlood
                  flood-color="rgba(255, 255, 255, 0.4)"
                  result="border-color"
                />
                <feComposite
                  operator="in"
                  in="border-color"
                  in2="border-mask"
                  result="border"
                />

                <!-- inset 0 2px 3px rgba(255, 255, 255, 0.4) -->
                <feOffset dx="0" dy="2" in="SourceAlpha" />
                <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
                <feComposite
                  operator="out"
                  in="SourceAlpha"
                  in2="offset-blur"
                  result="inverse"
                />
                <feFlood
                  flood-color="rgba(255, 255, 255, 0.4)"
                  result="inset-color"
                />
                <feComposite
                  operator="in"
                  in="inset-color"
                  in2="inverse"
                  result="inset"
                />

                <feMerge>
                  <feMergeNode in="border" />
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode in="inset" />
                </feMerge>
              </filter>
              <filter id="blur-sm" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" />
              </filter>
              <filter id="blur-md" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
            </defs>

            <!-- Группа с отбрасываемой тенью -->
            <g style="filter: drop-shadow(0px 6px 8px rgba(0, 0, 0, 0.2))">
              <!-- 1. Базовые цветные сегменты -->
              <g filter="url(#glass-inset)">
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
                  stroke-opacity="0.4"
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
                  stroke-opacity="0.3"
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
            <span
              class="inline-flex items-center justify-center leading-none text-xs text-white"
              style="
                filter: drop-shadow(0px 1px 3px rgba(255, 255, 255, 0.3));
                opacity: 0.8;
              "
            >
              {{ seg.icon || "❔" }}
            </span>
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
              boxShadow: `inset 0 1px 2px rgba(255, 255, 255, 0.75)`,
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
