<script setup lang="ts">
/**
 * @module app/components/categories/CategoryItem
 * @fileoverview Компонент отображения отдельной категории.
 * @description
 * Отображает иконку и название категории.
 * По клику вызывает событие редактирования.
 * Свайп влево открывает кнопку удаления.
 */
import { ref, watch, useId } from "vue";
import { Trash2 } from "@lucide/vue";
import { onClickOutside } from "@vueuse/core";

interface Props {
  icon?: string;
  name: string;
  defaultIcon?: string;
}

withDefaults(defineProps<Props>(), {
  icon: undefined,
  defaultIcon: "💸",
});

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

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

  // Если свайпнули очень далеко — удаляем сразу
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
  if (isRevealed.value) {
    closeSwipe();
    return;
  }
  emit("edit");
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
  <div ref="itemRef" class="category-item relative overflow-hidden rounded-xl">
    <!-- Контейнер, который двигается целиком -->
    <div
      class="flex w-full"
      :style="{
        transform: `translateX(${offsetX}px)`,
        transition: isSwiping
          ? 'none'
          : 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
      }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Основное содержимое -->
      <div
        class="category-content w-full shrink-0 flex items-center justify-between px-3 py-2 bg-transparent z-10 border-b border-black/6 cursor-pointer active:opacity-80"
        @click="onItemClick"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="size-9 rounded-full glass-milky flex items-center justify-center text-lg shrink-0"
          >
            {{ icon || defaultIcon }}
          </div>
          <span class="w-full text-text-primary font-medium text-sm truncate">
            {{ name }}
          </span>
        </div>
      </div>

      <!-- Кнопка удаления (сбоку, вне экрана) -->
      <div
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
.category-item:last-child .category-content {
  border-bottom-width: 0;
}
</style>
