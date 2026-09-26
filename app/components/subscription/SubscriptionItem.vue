<script setup lang="ts">
/**
 * @module app/components/subscription/SubscriptionItem
 * @fileoverview Компонент отображения отдельного регулярного платежа.
 * @description
 * Отображает иконку, название, число списания и сумму платежа в строке списка.
 * По клику открывает редактирование. Свайп влево открывает кнопку удаления через `SwipeableRow`.
 */
import { formatAmount } from "~/utils/format";
import type { Subscription } from "~/composables/useSubscriptions";

interface Props {
  subscription: Subscription & { statusLabel?: string; statusType?: string };
  interactive?: boolean;
}

withDefaults(defineProps<Props>(), {
  interactive: true,
});

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();
</script>

<template>
  <SwipeableRow
    :disabled="!interactive"
    class="subscription-item glass-milky rounded-3xl border-r-0"
    content-class="subscription-content flex items-center justify-between px-4 py-2.5 cursor-pointer active:opacity-80"
    @click="emit('edit')"
    @delete="emit('delete')"
  >
    <div class="flex items-center gap-3 min-w-0">
      <!-- Иконка категории или эмодзи -->
      <div
        class="size-9 rounded-full glass-pill flex items-center justify-center text-lg shrink-0"
      >
        {{ subscription.categoryIcon || "💸" }}
      </div>

      <div class="flex flex-col min-w-0">
        <span class="text-text-primary font-bold text-base truncate">
          {{ subscription.name }}
        </span>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="text-text-secondary text-xs">
            {{ subscription.day_of_month }}-го числа
          </span>
          <span
            v-if="subscription.statusLabel"
            class="text-[10px] px-1.5 py-0.2 rounded-full font-semibold"
            :class="{
              'bg-accent-red/15 text-accent-red':
                subscription.statusType === 'today',
              'bg-accent-orange/15 text-accent-orange':
                subscription.statusType === 'soon',
              'bg-black/5 text-text-secondary':
                subscription.statusType === 'upcoming' ||
                subscription.statusType === 'past',
            }"
          >
            {{ subscription.statusLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Сумма платежа -->
    <div class="flex flex-col items-end shrink-0 pl-2">
      <span class="text-text-primary font-bold text-sm tracking-tight">
        {{ formatAmount(subscription.amount) }}
      </span>
      <span class="text-[10px] text-text-secondary">/ месяц</span>
    </div>
  </SwipeableRow>
</template>

<style scoped>
.subscription-item:last-child .subscription-content {
  border-bottom-width: 0;
}
</style>
