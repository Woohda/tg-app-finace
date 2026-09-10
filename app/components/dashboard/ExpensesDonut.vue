<script setup lang="ts">
/**
 * @module app/components/dashboard/ExpensesDonut
 * @fileoverview Кольцевой график расходов с распределением по категориям (Top 5)
 * @description
 * Отображает общие расходы за месяц и пропорциональное кольцо по главным категориям трат.
 * Иконки (Lucide) накладываются автоматически на каждый сегмент графика.
 * Общая сумма берется из мока (mockTotalExpense), но доли строятся локально (localTotal), чтобы всегда замыкать круг.
 * ---
 * ### Особенности:
 * - Стилистика: Neumorphism (объемные тени, отсутствие жестких граней)
 * - Резиновая (прогрессивная) ширина легенды с обрезанием длинного текста.
 * - Индивидуальные gap-отступы между SVG-кривыми.
 */
import { computed } from "vue";
import { formatAmount } from "~/utils";
import { mockTotalExpense } from "~/mocks/dashboard";
import {
  ChartColumn,
  ShoppingBag,
  Coffee,
  Car,
  HeartPulse,
  Sparkles,
  Receipt,
  GraduationCap,
  Utensils,
  HelpCircle,
} from "@lucide/vue";
import GlassCard from "~/components/GlassCard.vue";

export interface CategoryBudgetData {
  id: string;
  name: string;
  amount: number;
  color: string;
}

const props = defineProps<{
  categories: CategoryBudgetData[];
}>();

const radius = 65;
const circumference = 2 * Math.PI * radius;
const gap = 25;

function getCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (
    n.includes("продукт") ||
    n.includes("еда") ||
    n.includes("кафе") ||
    n.includes("ресторан")
  )
    return Utensils;
  if (n.includes("транспорт") || n.includes("авто") || n.includes("такси"))
    return Car;
  if (n.includes("здоров") || n.includes("аптек")) return HeartPulse;
  if (n.includes("одежда") || n.includes("шопинг")) return ShoppingBag;
  if (n.includes("жкх") || n.includes("счет") || n.includes("коммунал"))
    return Receipt;
  if (n.includes("развлеч") || n.includes("кино")) return Sparkles;
  if (n.includes("образ") || n.includes("курс")) return GraduationCap;
  if (n.includes("кофе")) return Coffee;
  return HelpCircle;
}

const localTotal = computed(() =>
  props.categories.reduce((acc, cat) => acc + cat.amount, 0),
);

const segments = computed(() => {
  let accumulatedOffset = 0;

  return props.categories.map((cat) => {
    const percentage = Math.min(cat.amount / Math.max(localTotal.value, 1), 1);
    const dashLength = percentage * circumference;
    const visibleLength = Math.max(0, dashLength - gap);
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
      IconComponent: getCategoryIcon(cat.name),
    };
  });
});
</script>

<template>
  <GlassCard>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-extrabold text-text-primary">Расходы</h3>
      <NuxtLink to="/finreports" class="text-text-secondary">
        <ChartColumn :stroke-width="1.5" />
      </NuxtLink>
    </div>

    <div class="flex items-center justify-between gap-5">
      <div class="relative w-43 h-43 shrink-0">
        <div
          class="absolute inset-0 rounded-full"
          style="box-shadow: var(--shadow-glass-inner)"
        />

        <svg
          class="w-full h-full -rotate-90 transform overflow-visible"
          viewBox="0 0 160 160"
        >
          <circle
            v-for="seg in segments"
            :key="seg.id"
            cx="80"
            cy="80"
            :r="radius"
            fill="none"
            :stroke="seg.color"
            stroke-width="25"
            :stroke-dasharray="seg.strokeDasharray"
            :stroke-dashoffset="seg.strokeDashoffset"
            stroke-linecap="round"
            class="transition-all duration-1000 ease-out"
            style="filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15))"
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
            class="w-3.5 h-3.5 text-white"
            style="
              filter: drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.4));
              opacity: 0.95;
            "
          />
        </div>

        <div
          class="absolute inset-0 flex flex-col items-center justify-center rounded-full m-8 glass-milky"
        >
          <span class="text-xs text-text-secondary font-bold tracking-wider"
            >Потрачено</span
          >
          <span class="text-md font-extrabold text-text-primary">{{
            formatAmount(mockTotalExpense)
          }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-3 min-w-0">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-start gap-3"
        >
          <div
            class="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            :style="{
              backgroundColor: cat.color,
              boxShadow: `0 0 8px ${cat.color}80`,
            }"
          />
          <div class="flex flex-col gap-1 min-w-0">
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
    </div>
  </GlassCard>
</template>
