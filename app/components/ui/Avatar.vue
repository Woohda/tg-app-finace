<script setup lang="ts">
/**
 * @module app/components/ui/Avatar
 * @fileoverview Круглый стеклянный аватар пользователя
 * @description
 * Отображает аватар пользователя (фото профиля из Telegram),
 * либо иконку-заглушку с эффектом матового стекла (.glass-milky).
 */
import { User } from "@lucide/vue";
import { cn } from "~/utils/cn";

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "size-10",
  md: "size-12",
  lg: "size-15",
};

const props = withDefaults(
  defineProps<{
    src?: string | null;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    src: null,
    size: "md",
  },
);
</script>

<template>
  <div
    :class="
      cn(
        'rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 overflow-hidden',
        sizeClasses[props.size],
      )
    "
  >
    <img
      v-if="src"
      :src="src"
      alt="Аватар пользователя"
      class="w-full h-full object-cover"
    />
    <User v-else class="text-text-primary" :stroke-width="1.75" aria-hidden="true" />
  </div>
</template>
