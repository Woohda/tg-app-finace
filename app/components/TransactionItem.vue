<script setup lang="ts">
/**
 * @module app/components/TransactionItem
 * @fileoverview Карточка транзакции со swipe-to-delete и возможностью клика
 * @description
 * Отображает иконку категории, название, дату и сумму.
 * Расходы — текстом primary, доходы — акцентным цветом.
 * Поддерживает горизонтальный свайп влево для показа кнопки «Удалить».
 */
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils";
import { Trash2 } from "@lucide/vue";

interface Props {
  class?: HTMLAttributes["class"];
  icon: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  /** Включает swipe-to-delete и click-to-edit */
  interactive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  interactive: false,
});

const emit = defineEmits<{
  click: [];
  delete: [];
}>();

const formattedAmount = computed(() => formatAmount(props.amount, props.type));
const formattedDate = computed(() => formatDate(props.date));

// --- Swipe logic ---
const offsetX = ref(0);
const startX = ref(0);
const isSwiping = ref(false);
const isRevealed = ref(false);

const DELETE_THRESHOLD = 72; // px — ширина кнопки удаления

function onTouchStart(e: TouchEvent) {
  if (!props.interactive) return;
  startX.value = e.touches[0]!.clientX;
  isSwiping.value = true;
}

function onTouchMove(e: TouchEvent) {
  if (!isSwiping.value) return;
  const diff = e.touches[0]!.clientX - startX.value;

  if (isRevealed.value) {
    // Уже открыта — разрешаем свайп вправо для закрытия
    offsetX.value = Math.min(0, Math.max(-DELETE_THRESHOLD, -DELETE_THRESHOLD + diff));
  } else {
    // Только свайп влево
    offsetX.value = Math.min(0, Math.max(-DELETE_THRESHOLD - 20, diff));
  }
}

function onTouchEnd() {
  if (!isSwiping.value) return;
  isSwiping.value = false;

  if (offsetX.value < -DELETE_THRESHOLD / 2) {
    // Открыть кнопку удаления
    offsetX.value = -DELETE_THRESHOLD;
    isRevealed.value = true;
  } else {
    // Закрыть
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
</script>

<template>
  <div class="relative overflow-hidden rounded-xl">
    <!-- Кнопка удаления (скрыта за элементом) -->
    <div
      v-if="interactive"
      class="absolute right-0 top-0 bottom-0 w-[72px] flex items-center justify-center bg-accent-end rounded-r-xl"
      @click="onDeleteClick"
    >
      <Trash2 class="size-5 text-white" :stroke-width="2" />
    </div>

    <!-- Основное содержимое (сдвигается при свайпе) -->
    <div
      :class="
        cn(
          'relative flex items-center gap-4 py-2 bg-transparent z-10',
          interactive && 'cursor-pointer active:opacity-80',
          props.class,
        )
      "
      :style="{
        transform: `translateX(${offsetX}px)`,
        transition: isSwiping ? 'none' : 'transform 0.25s ease-out',
      }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
      @click="onItemClick"
    >
      <!-- Иконка категории -->
      <div
        class="shrink-0 size-12 rounded-2xl glass-milky shadow-glass-flat flex items-center justify-center text-xl border-[0.5px] border-white/50 border-b-transparent border-r-transparent"
      >
        {{ icon }}
      </div>

      <!-- Название + дата -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-text-primary truncate">{{ name }}</p>
        <p class="text-xs text-text-secondary truncate mt-0.5">
          {{ formattedDate }}
        </p>
      </div>

      <!-- Сумма -->
      <div class="text-right">
        <p
          class="font-bold text-[15px]"
          :class="type === 'income' ? 'text-text-accent' : 'text-text-primary'"
        >
          {{ formattedAmount }}
        </p>
      </div>
    </div>
  </div>
</template>
