<script setup lang="ts">
/**
 * @module app/components/analytics/AnalyticsSummaryCard
 * @fileoverview Карточка со сводкой (Расходы / Доходы) с трендом изменения
 */
import { computed } from "vue";
import { TrendingUp, TrendingDown, Minus } from "@lucide/vue";
import { formatAmount } from "~/utils/format";

const props = defineProps<{
  title: string;
  amount: number;
  percentChange?: number | null;
  prevPeriodLabel: string;
  trendType: "expense" | "income";
}>();

const trendColor = computed(() => {
  const change = props.percentChange ?? 0;
  if (change === 0) {
    return "text-text-secondary";
  }
  if (props.trendType === "income") {
    return change > 0 ? "text-text-success" : "text-text-accent";
  } else {
    return change > 0 ? "text-text-accent" : "text-text-success";
  }
});

const trendIcon = computed(() => {
  const change = props.percentChange ?? 0;
  if (change === 0) {
    return Minus;
  }
  return change > 0 ? TrendingUp : TrendingDown;
});

const hasTrend = computed(() => {
  return props.percentChange !== null && props.percentChange !== undefined;
});
</script>

<template>
  <GlassCard class="flex-1 p-4 flex flex-col justify-center gap-1">
    <p
      class="text-text-secondary text-[11px] font-bold uppercase tracking-wider"
    >
      {{ title }}
    </p>
    <span class="text-text-primary text-xl font-bold">{{
      formatAmount(amount)
    }}</span>

    <div v-if="hasTrend" class="flex items-center gap-1">
      <div class="p-1 rounded-full glass-pill">
        <component :is="trendIcon" class="w-3 h-3" :class="trendColor" />
      </div>
      <span class="text-xs" :class="trendColor">
        {{ percentChange && percentChange > 0 ? "+" : "" }}{{ percentChange }}%
        {{ prevPeriodLabel }}
      </span>
    </div>
  </GlassCard>
</template>
