<script setup lang="ts">
/**
 * @module app/components/analytics/AnalyticsSummaryCard
 * @fileoverview Карточка со сводкой (Расходы / Доходы) с трендом изменения
 */
import { computed } from "vue";
import { TrendingUp, TrendingDown } from "@lucide/vue";
import { formatAmount } from "~/utils";

const props = defineProps<{
  title: string;
  amount: number;
  percentChange: number;
  prevPeriodLabel: string;
  trendType: "expense" | "income";
}>();

const trendColor = computed(() => {
  if (props.trendType === "income") {
    return props.percentChange > 0 ? "text-text-success" : "text-text-accent";
  } else {
    return props.percentChange > 0 ? "text-text-accent" : "text-text-success";
  }
});

const trendIcon = computed(() => {
  return props.percentChange > 0 ? TrendingUp : TrendingDown;
});
</script>

<template>
  <GlassCard class="flex-1 p-4 flex flex-col justify-center gap-1">
    <p
      class="text-text-secondary text-[11px] font-bold uppercase tracking-wide"
    >
      {{ title }}
    </p>
    <span class="text-text-primary text-xl font-bold tracking-tighter">{{
      formatAmount(amount)
    }}</span>

    <div v-if="percentChange <= 100" class="flex items-center gap-1">
      <div class="p-1 rounded-full glass-pill">
        <component :is="trendIcon" class="w-3 h-3" :class="trendColor" />
      </div>
      <span class="text-xs" :class="trendColor">
        {{ percentChange > 0 ? "+" : "" }}{{ percentChange }}%
        {{ prevPeriodLabel }}
      </span>
    </div>
  </GlassCard>
</template>
