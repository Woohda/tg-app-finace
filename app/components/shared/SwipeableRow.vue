<script setup lang="ts">
/**
 * @module app/components/shared/SwipeableRow
 * @fileoverview Универсальный компонент строки со свайпом для удаления (Swipe to Action)
 * @description
 * Обеспечивает плавный свайп влево с физикой резинового натяжения (rubber-banding),
 * взаимным закрытием других открытых строк через `useGlobalActiveSwipeId`,
 * автоматическим закрытием по клику вне элемента (`onClickOutside`)
 * и встроенной кнопкой удаления с тактильным откликом.
 * ---
 * ### Логика работы:
 * 1. Обрабатывает тач-события `touchstart`, `touchmove` и `touchend`.
 * 2. При свайпе влево раскрывает кнопку действия с порогом `deleteThreshold` (по умолчанию 72px).
 * 3. При глубоком свайпе (`fullDeleteThreshold`, по умолчанию 120px) моментально вызывает событие удаления.
 * 4. Если ряд уже раскрыт, нажатие по контенту плавно закрывает его без вызова события `click`.
 * 5. При раскрытии другого ряда в приложении текущий автоматически схлопывается через глобальный стор.
 */
import type { HTMLAttributes } from "vue";
import { ref, watch, useId } from "vue";
import { Trash2 } from "@lucide/vue";
import { onClickOutside } from "@vueuse/core";
import { cn } from "~/utils/cn";
import { getHapticFeedback } from "~/utils/haptics";

interface Props {
  class?: HTMLAttributes["class"];
  contentClass?: HTMLAttributes["class"];
  disabled?: boolean;
  deleteThreshold?: number;
  fullDeleteThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), {
  class: undefined,
  contentClass: undefined,
  disabled: false,
  deleteThreshold: 72,
  fullDeleteThreshold: 120,
});

const emit = defineEmits<{
  click: [];
  delete: [];
}>();

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

function onTouchStart(e: TouchEvent) {
  if (props.disabled) return;
  startX.value = e.touches[0]!.clientX;
  isSwiping.value = true;
  activeSwipeId.value = itemId;
}

function onTouchMove(e: TouchEvent) {
  if (!isSwiping.value || props.disabled) return;

  let targetX = e.touches[0]!.clientX - startX.value;
  if (isRevealed.value) {
    targetX -= props.deleteThreshold;
  }

  // Физика резинового сопротивления (rubber-banding)
  if (targetX > 0) {
    offsetX.value = targetX * 0.15;
  } else if (targetX < -props.deleteThreshold) {
    const overdrag = targetX + props.deleteThreshold;
    offsetX.value = -props.deleteThreshold + overdrag * 0.15;
  } else {
    offsetX.value = targetX;
  }
}

function onTouchEnd() {
  if (!isSwiping.value) return;
  isSwiping.value = false;

  // Быстрый полный свайп для моментального удаления
  if (offsetX.value < -props.fullDeleteThreshold) {
    triggerDelete();
  } else if (offsetX.value < -props.deleteThreshold / 2) {
    // Раскрытие кнопки удаления
    if (!isRevealed.value) {
      getHapticFeedback().impact("light");
    }
    offsetX.value = -props.deleteThreshold;
    isRevealed.value = true;
  } else {
    // Возврат в закрытое состояние
    closeSwipe();
  }
}

function closeSwipe() {
  offsetX.value = 0;
  isRevealed.value = false;
}

function triggerDelete() {
  getHapticFeedback().notification("warning");
  emit("delete");
  closeSwipe();
}

function onContentClick() {
  if (isRevealed.value) {
    closeSwipe();
    return;
  }
  emit("click");
}

function onDeleteClick() {
  triggerDelete();
}

const itemRef = ref<HTMLElement | null>(null);

onClickOutside(itemRef, () => {
  if (isRevealed.value) {
    closeSwipe();
  }
});

defineExpose({
  closeSwipe,
  isRevealed,
});
</script>

<template>
  <div
    ref="itemRef"
    :class="cn('relative overflow-hidden select-none', props.class)"
  >
    <!-- Контейнер со сдвигом -->
    <div
      class="flex w-full"
      :style="{
        transform: `translateX(${offsetX}px)`,
        transition: isSwiping
          ? 'none'
          : 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform',
      }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Основное содержимое -->
      <div
        :class="cn('w-full shrink-0 z-10', contentClass)"
        @click="onContentClick"
      >
        <slot :is-revealed="isRevealed" :close="closeSwipe" />
      </div>

      <!-- Кнопка действия (по умолчанию корзина) -->
      <slot
        v-if="!disabled"
        name="action"
        :close="closeSwipe"
        :on-delete="onDeleteClick"
      >
        <div
          class="w-17 ml-1 pr-px shrink-0 flex items-center justify-center bg-accent-mid rounded-r-3xl cursor-pointer"
          style="
            box-shadow:
              inset 3px 3px 8px rgba(255, 255, 255, 0.2),
              inset -4px -4px 10px rgba(140, 15, 5, 0.3);
          "
          @click.stop="onDeleteClick"
        >
          <Trash2 class="size-6 text-white" :stroke-width="1.5" />
        </div>
      </slot>
    </div>
  </div>
</template>
