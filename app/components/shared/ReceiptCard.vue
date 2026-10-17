<script setup lang="ts">
/**
 * @module app/components/shared/ReceiptCard
 * @fileoverview Базовый контейнер кассового чека с перфорированными краями
 * @description
 * Аутентичная обертка для чеков с волновыми зубцами по верхнему и нижнему краю
 * (scalloped edges), боковыми круглыми вырезами на линии перфорации, встроенной
 * шапкой со штрихкодом и футером с поддержкой пагинации.
 */
import type { HTMLAttributes } from "vue";
import { cn } from "~/utils/cn";

interface Props {
  class?: HTMLAttributes["class"];
  sideCutOffset?: string;
  title?: string;
  count?: number;
  amountText?: string;
  hasMore?: boolean;
  remainingCount?: number;
  onTriggerMounted?: (el: HTMLElement | null) => void;
}

const props = withDefaults(defineProps<Props>(), {
  class: undefined,
  sideCutOffset: "56.5px",
  title: undefined,
  count: undefined,
  amountText: undefined,
  hasMore: false,
  remainingCount: 0,
  onTriggerMounted: undefined,
});

const emit = defineEmits<{
  (e: "loadMore"): void;
}>();
</script>

<template>
  <div :class="cn('receipt-wrapper w-full', props.class)">
    <!-- Слой сквозных боковых вырезов билета -->
    <div
      class="receipt-side-cuts w-full"
      :style="{ '--receipt-cut-offset': sideCutOffset }"
    >
      <GlassCard
        class="receipt-card p-0 relative text-text-primary transition-all duration-300 rounded-none"
      >
        <!-- Шапка чека -->
        <slot name="header">
          <div
            v-if="title"
            class="flex flex-col gap-1 items-center justify-center pt-5 select-none"
          >
            <ReceiptBarcode />

            <div class="w-full px-5">
              <div class="flex flex-col gap-px">
                <h2
                  class="text-[15px] text-center font-semibold text-black tracking-[0.2em] uppercase truncate"
                >
                  {{ title }}
                </h2>

                <div
                  v-if="count !== undefined || amountText"
                  class="flex items-center justify-between"
                >
                  <span
                    v-if="count !== undefined"
                    class="shrink-0 text-xs text-text-secondary"
                  >
                    Кол-во операций:
                    <strong class="text-[13px]">{{ count }}</strong>
                  </span>

                  <span
                    v-if="amountText"
                    class="text-[13px] font-semibold text-text-secondary"
                  >
                    {{ amountText }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Верхний пунктирный разделитель -->
            <ReceiptDivider variant="dotted" class="w-full px-5" />
          </div>
        </slot>

        <!-- Тело чека -->
        <slot />

        <!-- Линия перфорации билета -->

        <ReceiptDivider variant="dashed" class="px-5" />

        <!-- Футер чека -->
        <slot name="footer">
          <div class="px-5 h-13.5 flex items-center justify-center pb-2">
            <!-- Кнопка пагинации при бесконечном скролле -->
            <div
              v-if="hasMore"
              :ref="(el) => onTriggerMounted?.(el as HTMLElement | null)"
              class="w-full flex justify-center"
            >
              <button
                type="button"
                class="text-xs font-semibold text-text-accent hover:text-text-primary active:scale-95 transition-all py-1.5 px-4 rounded-full glass-pill cursor-pointer flex items-center gap-1.5 a11y-focus"
                @click="emit('loadMore')"
              >
                <span>Показать ещё ({{ remainingCount }})</span>
              </button>
            </div>

            <!-- Финальная подпись окончания выписки -->
            <div
              v-else
              class="text-[10px] font-bold text-text-secondary tracking-widest uppercase opacity-70"
            >
              • КОНЕЦ ВЫПИСКИ •
            </div>
          </div>
        </slot>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
/* Тень обертки, повторяющая контур маски чека и боковых вырезов */
.receipt-wrapper {
  filter: drop-shadow(0 5px 10px rgba(130, 115, 105, 0.1))
    drop-shadow(0 1px 1px rgba(255, 255, 255, 0.8));
}

/* Сквозные боковые полукруглые вырезы на линии перфорации билета */
.receipt-side-cuts {
  -webkit-mask-image:
    radial-gradient(
      circle 16px at 0 calc(100% - var(--receipt-cut-offset, 55px)),
      transparent 15.5px,
      #000 16px
    ),
    radial-gradient(
      circle 16px at 100% calc(100% - var(--receipt-cut-offset, 55px)),
      transparent 15.5px,
      #000 16px
    );
  -webkit-mask-size:
    50% 100%,
    50% 100%;
  -webkit-mask-position:
    left top,
    right top;
  -webkit-mask-repeat: no-repeat, no-repeat;

  mask-image:
    radial-gradient(
      circle 16px at 0 calc(100% - var(--receipt-cut-offset, 55px)),
      transparent 15.5px,
      #000 16px
    ),
    radial-gradient(
      circle 16px at 100% calc(100% - var(--receipt-cut-offset, 55px)),
      transparent 15.5px,
      #000 16px
    );
  mask-size:
    50% 100%,
    50% 100%;
  mask-position:
    left top,
    right top;
  mask-repeat: no-repeat, no-repeat;
}

/* Физическая маска перфорированных зубцов по верхнему и нижнему краю чека */
.receipt-card {
  -webkit-mask-image:
    radial-gradient(13px 15px at 24.5px 0px, transparent 13px, #000 13.5px),
    linear-gradient(to bottom, #000, #000),
    radial-gradient(13px 15px at 24.5px 15px, transparent 13px, #000 13.5px);
  -webkit-mask-size:
    49px 15px,
    100% calc(100% - 30px),
    49px 15px;
  -webkit-mask-position:
    center top,
    center 15px,
    center bottom;
  -webkit-mask-repeat: repeat-x, no-repeat, repeat-x;

  mask-image:
    radial-gradient(13px 15px at 24.5px 0px, transparent 13px, #000 13.5px),
    linear-gradient(to bottom, #000, #000),
    radial-gradient(13px 15px at 24.5px 15px, transparent 13px, #000 13.5px);
  mask-size:
    49px 15px,
    100% calc(100% - 30px),
    49px 15px;
  mask-position:
    center top,
    center 15px,
    center bottom;
  mask-repeat: repeat-x, no-repeat, repeat-x;
}
</style>
