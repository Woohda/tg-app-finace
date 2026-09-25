<script setup lang="ts">
/**
 * @module app/components/subscription/SubscriptionItem
 * @fileoverview Компонент отображения отдельного регулярного платежа.
 * @description
 * Отображает иконку, название, число списания и сумму платежа в строке списка.
 * По клику открывает редактирование. Свайп влево открывает кнопку удаления (Trash2).
 * Полностью повторяет архитектуру и UX компонента CategoryItem.
 */
import { ref, watch, useId } from "vue";
import { Trash2 } from "@lucide/vue";
import { onClickOutside } from "@vueuse/core";
import { formatAmount } from "~/utils";
import type { Subscription } from "~/composables/useSubscriptions";

interface Props {
  subscription: Subscription & { statusLabel?: string; statusType?: string };
  interactive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  interactive: true,
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
  <div
    ref="itemRef"
    class="subscription-item relative glass-milky rounded-3xl border-r-0 overflow-hidden"
  >
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
        class="subscription-content w-full shrink-0 flex items-center justify-between px-4 py-2.5 z-10 cursor-pointer active:opacity-80"
        @click="onItemClick"
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
      </div>

      <!-- Кнопка удаления (сбоку, вне экрана) -->
      <div
        class="w-17 ml-1 pr-px shrink-0 flex items-center justify-center bg-accent-mid rounded-r-3xl cursor-pointer"
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
.subscription-item:last-child .subscription-content {
  border-bottom-width: 0;
}
</style>
