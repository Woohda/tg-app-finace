<script setup lang="ts">
/**
 * @module app/components/shared/GlassErrorState
 * @fileoverview Единый компонент отображения ошибки загрузки данных с кнопкой повтора
 * @description
 * Отображает стилизованный блок в стиле Glassmorphism с сообщением об ошибке
 * и интерактивной кнопкой для повторного запроса данных (Retry).
 * Поддерживает:
 * - стандартный режим по центру (для страниц);
 * - компактный режим (для дашборда и виджетов);
 * - режим без внешней карточки (asCard = false) для размещения внутри существующего GlassCard.
 */
import { AlertTriangle } from "@lucide/vue";

interface Props {
  title?: string;
  error?: string | null;
  retryText?: string;
  showRetry?: boolean;
  compact?: boolean;
  asCard?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: "Не удалось загрузить данные",
  error: null,
  retryText: "Повторить попытку",
  showRetry: true,
  compact: false,
  asCard: true,
});

const emit = defineEmits<{
  (e: "retry"): void;
}>();
</script>

<template>
  <component
    :is="asCard ? 'GlassCard' : 'div'"
    :class="[
      compact
        ? 'p-3.5 flex items-center justify-between gap-3'
        : asCard
          ? 'p-6 flex flex-col items-center justify-center text-center gap-3'
          : 'flex flex-col items-center justify-center text-center py-4 gap-2',
    ]"
  >
    <!-- Компактный режим (для дашборда) -->
    <template v-if="compact">
      <div class="flex items-center gap-2.5 text-left min-w-0">
        <slot name="icon">
          <div
            class="size-8 rounded-full glass-pill flex items-center justify-center shrink-0 text-text-accent"
          >
            <AlertTriangle class="size-4.5" :stroke-width="2" />
          </div>
        </slot>
        <div class="flex flex-col min-w-0">
          <h3 class="text-xs font-bold text-text-primary truncate">
            <slot name="title">{{ title }}</slot>
          </h3>
          <p v-if="error" class="text-[11px] text-text-secondary truncate">
            <slot name="error">{{ error }}</slot>
          </p>
        </div>
      </div>

      <GlassButton
        v-if="showRetry"
        variant="soft"
        size="sm"
        class="shrink-0 text-xs"
        @click="emit('retry')"
      >
        {{ retryText }}
      </GlassButton>
    </template>

    <!-- Стандартный режим (по центру) -->
    <template v-else>
      <slot name="icon">
        <div
          class="rounded-full glass-pill flex items-center justify-center text-text-accent shrink-0"
          :class="asCard ? 'size-12' : 'size-10'"
        >
          <AlertTriangle
            :class="asCard ? 'size-6' : 'size-5'"
            :stroke-width="1.8"
          />
        </div>
      </slot>

      <div class="flex flex-col gap-1 max-w-sm">
        <h3
          class="text-text-primary font-bold leading-snug"
          :class="asCard ? 'text-base' : 'text-sm'"
        >
          <slot name="title">{{ title }}</slot>
        </h3>
        <p v-if="error" class="text-text-secondary text-xs leading-relaxed">
          <slot name="error">{{ error }}</slot>
        </p>
      </div>

      <GlassButton
        v-if="showRetry"
        variant="soft"
        size="sm"
        class="mt-1"
        @click="emit('retry')"
      >
        {{ retryText }}
      </GlassButton>
    </template>
  </component>
</template>
