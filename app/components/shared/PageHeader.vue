<script setup lang="ts">
/**
 * @module app/components/shared/PageHeader
 * @fileoverview Унифицированная шапка страницы со стрелкой назад, заголовком и кнопками действий
 * @description
 * Обеспечивает стандартизированный заголовок с поддержкой навигации (NuxtLink / router.back()),
 * центрированным заголовком с подзаголовком и правой областью действий
 * (через стандартный GlassButton или произвольный слот #action для нескольких кнопок).
 */
import type { Component } from "vue";
import { ChevronLeft, Plus } from "@lucide/vue";
import GlassButton from "./GlassButton.vue";

withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    backTo?: string | null;
    backAriaLabel?: string;
    showAction?: boolean;
    actionAriaLabel?: string;
    actionIcon?: Component;
    actionClass?: string;
    actionIconClass?: string;
    wideActions?: boolean;
  }>(),
  {
    title: "",
    subtitle: undefined,
    backTo: "/settings",
    backAriaLabel: "Назад",
    showAction: false,
    actionAriaLabel: "Добавить",
    actionIcon: undefined,
    actionClass: undefined,
    actionIconClass: undefined,
    wideActions: false,
  },
);

const emit = defineEmits<{
  (e: "action" | "back"): void;
}>();

const router = useRouter();

const handleBackClick = () => {
  emit("back");
  router.back();
};
</script>

<template>
  <header
    class="flex items-center justify-center gap-3 relative min-h-12 shrink-0 mt-1.5"
  >
    <!-- Левая кнопка (Назад) -->
    <slot name="back">
      <NuxtLink
        v-if="backTo && backTo !== 'back'"
        :to="backTo"
        :aria-label="backAriaLabel"
        class="w-12 h-12 absolute left-0 top-4.5 -translate-y-1/2 rounded-full glass-pill flex items-center justify-center shrink-0 active:scale-95 transition-transform a11y-focus"
        @click="emit('back')"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </NuxtLink>
      <GlassButton
        v-else
        variant="soft"
        size="icon"
        class="absolute left-0 top-1/2 -translate-y-1/2"
        :aria-label="backAriaLabel"
        @click="handleBackClick"
      >
        <ChevronLeft class="text-text-primary -ml-px" :stroke-width="1.5" />
      </GlassButton>
    </slot>

    <!-- Центр: Заголовок и подзаголовок -->
    <slot>
      <div
        class="flex flex-col text-center max-w-full"
        :class="wideActions ? 'px-24' : 'px-14'"
      >
        <slot name="title">
          <h1
            class="text-text-primary text-xl font-bold tracking-wide line-clamp-1"
          >
            {{ title }}
          </h1>
        </slot>
        <slot name="subtitle">
          <p v-if="subtitle" class="text-text-secondary text-xs line-clamp-1">
            {{ subtitle }}
          </p>
        </slot>
      </div>
    </slot>

    <!-- Правая область действий -->
    <div
      v-if="$slots.action || showAction"
      class="absolute right-0 top-4.5 -translate-y-1/2 flex items-center gap-1"
    >
      <slot name="action">
        <GlassButton
          v-if="showAction"
          variant="soft"
          size="icon"
          :class="actionClass"
          :aria-label="actionAriaLabel"
          @click="emit('action')"
        >
          <component
            :is="actionIcon || Plus"
            :class="actionIconClass || 'text-text-primary'"
            :stroke-width="1.5"
          />
        </GlassButton>
      </slot>
    </div>
  </header>
</template>
