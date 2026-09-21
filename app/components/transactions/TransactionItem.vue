<script setup lang="ts">
/**
 * @module app/components/transaction/TransactionItem
 * @fileoverview Компонент отображения отдельной транзакции в списке.
 * @description
 * Отображает иконку категории, название, дату и сумму транзакции.
 * Цвет суммы зависит от типа транзакции (доход/расход).
 * По клику вызывает `useTransactionModal` в режиме редактирования.
 */
import type { HTMLAttributes } from "vue";
import { ref, watch, useId } from "vue";
import { cn } from "~/utils";
import { Trash2 } from "@lucide/vue";
import { onClickOutside } from "@vueuse/core";

interface Props {
  class?: HTMLAttributes["class"];
  icon?: string;
  title: string;
  subtitle?: string | null;
  amount: number;
  type: "income" | "expense";
  date: string;
  interactive?: boolean;
  showFullDate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  class: undefined,
  interactive: false,
  icon: undefined,
  subtitle: undefined,
  showFullDate: false,
});

const emit = defineEmits<{
  click: [];
  delete: [];
}>();

const formattedAmount = computed(() => formatAmount(props.amount, props.type));
const formattedDate = computed(() =>
  formatDate(props.date, props.showFullDate),
);

// --- Логика свайпа ---
const offsetX = ref(0);
const startX = ref(0);
const isSwiping = ref(false);
const isRevealed = ref(false);

const itemId = useId();
const activeSwipeId = useGlobalActiveSwipeId();

watch(activeSwipeId, (newId) => {
  if (newId !== itemId && isRevealed.value) {
    closeSwipe();
  }
});

const DELETE_THRESHOLD = 72;

function onTouchStart(e: TouchEvent) {
  if (!props.interactive) return;
  startX.value = e.touches[0]!.clientX;
  isSwiping.value = true;
  activeSwipeId.value = itemId;
}

function onTouchMove(e: TouchEvent) {
  if (!isSwiping.value) return;

  let targetX = e.touches[0]!.clientX - startX.value;
  if (isRevealed.value) {
    targetX -= DELETE_THRESHOLD;
  }

  // Rubber-banding (физическое сопротивление)
  if (targetX > 0) {
    offsetX.value = targetX * 0.15;
  } else if (targetX < -DELETE_THRESHOLD) {
    const overdrag = targetX + DELETE_THRESHOLD;
    offsetX.value = -DELETE_THRESHOLD + overdrag * 0.15;
  } else {
    offsetX.value = targetX;
  }
}

function onTouchEnd() {
  if (!isSwiping.value) return;
  isSwiping.value = false;

  if (offsetX.value < -120) {
    emit("delete");
    closeSwipe();
  } else if (offsetX.value < -DELETE_THRESHOLD / 2) {
    offsetX.value = -DELETE_THRESHOLD;
    isRevealed.value = true;
  } else {
    offsetX.value = 0;
    isRevealed.value = false;
  }
}

function closeSwipe() {
  offsetX.value = 0;
  isRevealed.value = false;
}

function onItemClick() {
  if (!props.interactive) return;
  if (isRevealed.value) {
    closeSwipe();
    return;
  }
  emit("click");
}

function onDeleteClick() {
  emit("delete");
  closeSwipe();
}

const itemRef = ref<HTMLElement | null>(null);

onClickOutside(itemRef, () => {
  if (isRevealed.value) {
    closeSwipe();
  }
});
</script>

<template>
  <div
    ref="itemRef"
    class="transaction-item relative overflow-hidden rounded-2xl"
  >
    <!-- Контейнер, который двигается целиком -->
    <div
      class="flex w-full"
      :style="{
        transform: `translateX(${offsetX}px)`,
        transition: isSwiping
          ? 'none'
          : 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform'
      }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Основное содержимое -->
      <div
        :class="
          cn(
            'transaction-content w-full shrink-0 flex items-center gap-2 pb-3 bg-transparent z-10 border-b border-black/6',
            interactive && 'cursor-pointer active:opacity-80',
            props.class,
          )
        "
        @click="onItemClick"
      >
        <!-- Иконка категории -->
        <div
          v-if="icon"
          class="shrink-0 size-11 rounded-2xl glass- flex items-center justify-center text-xl border-[0.5px] border-white/50 border-b-transparent border-r-transparent"
          style="
            background: rgba(255, 255, 255, 0.7);
            box-shadow:
              inset 3px 3px 8px rgba(255, 255, 255, 1),
              inset -4px -4px 10px rgba(130, 115, 105, 0.15);
          "
        >
          {{ icon }}
        </div>

        <!-- Название + описание + дата -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-text-primary truncate">
            {{ title }}
          </p>
          <div class="w-full flex text-xs text-text-secondary mt-0.5">
            <span class="shrink-0"> {{ formattedDate }}</span>
            <span v-if="subtitle" class="truncate">,&nbsp;{{ subtitle }}</span>
          </div>
        </div>

        <!-- Сумма -->
        <div class="text-right">
          <p
            class="font-bold text-[15px]"
            :class="
              type === 'income' ? 'text-text-accent' : 'text-text-primary'
            "
          >
            {{ formattedAmount }}
          </p>
        </div>
      </div>

      <!-- Кнопка удаления (сбоку, вне экрана) -->
      <div
        v-if="interactive"
        class="w-17 ml-1 pr-px shrink-0 flex items-center justify-center bg-accent-mid rounded-r-3xl"
        style="
          box-shadow:
            inset 3px 3px 8px rgba(255, 255, 255, 0.2),
            inset -4px -4px 10px rgba(140, 15, 5, 0.3);
        "
        @click="onDeleteClick"
      >
        <Trash2 class="size-6 text-white" :stroke-width="1.5" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.transaction-item:last-child .transaction-content {
  border-bottom-width: 0;
}
</style>
