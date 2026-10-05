<script setup lang="ts">
/**
 * @module app/components/shared/TransactionSkeletonList
 * @fileoverview Скелетоны для списка транзакций во время загрузки.
 */
import Skeleton from "~/components/ui/Skeleton.vue";

withDefaults(
  defineProps<{
    count?: number;
    mode?: "card" | "list";
    showIcon?: boolean;
  }>(),
  {
    count: 4,
    mode: "card",
    showIcon: true,
  },
);
</script>

<template>
  <div
    v-for="i in count"
    :key="i"
    class="flex items-center gap-3 pb-3 border-b border-black/6 last:border-none"
  >
    <Skeleton
      v-if="showIcon"
      class="w-10 h-10 shrink-0"
      rounded="rounded-xl"
    />
    <div class="flex-1 flex flex-col gap-2">
      <Skeleton class="w-35 h-4" />
      <Skeleton class="w-15 h-3" />
    </div>
    <Skeleton class="w-17 h-5" rounded="rounded-xl" />
  </div>
</template>
