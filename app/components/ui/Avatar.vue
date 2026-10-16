<script setup lang="ts">
/**
 * @module app/components/ui/Avatar
 * @fileoverview Круглый стеклянный аватар пользователя
 * @description
 * Отображает аватар пользователя (фото профиля из Telegram),
 * текстовые инициалы (при передаче имени и отсутствии фото),
 * либо иконку-заглушку с эффектом матового стекла (.glass-pill).
 * ---
 * ### Логика работы:
 * 1. Если передан `src` — отображает изображение пользователя.
 * 2. Если `src` отсутствует, но передан `name` — извлекает инициалы через `getInitials`.
 * 3. Если нет ни фото, ни имени — отображает иконку `User`.
 */
import type { HTMLAttributes } from "vue";
import { computed, ref, watch } from "vue";
import { User } from "@lucide/vue";
import { cn } from "~/utils/cn";
import { getInitials } from "~/utils/format";

const sizeClasses: Record<"xs" | "sm" | "md" | "lg", string> = {
  xs: "size-6 text-[11px]",
  sm: "size-8 text-xs",
  md: "size-12 text-base",
  lg: "size-15 text-xl",
};

const iconSizeClasses: Record<"xs" | "sm" | "md" | "lg", string> = {
  xs: "size-3",
  sm: "size-4",
  md: "size-6",
  lg: "size-7.5",
};

interface Props {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  name: null,
  size: "md",
  class: undefined,
});

const hasImageError = ref(false);

watch(
  () => props.src,
  () => {
    hasImageError.value = false;
  },
);

const initials = computed(() => getInitials(props.name));
</script>

<template>
  <div
    :class="
      cn(
        'rounded-full glass-pill flex items-center justify-center shrink-0 overflow-hidden font-bold select-none text-text-primary',
        sizeClasses[props.size],
        props.class,
      )
    "
  >
    <NuxtImg
      v-if="src && !hasImageError"
      :src="src"
      :alt="name ? `Аватар ${name}` : 'Аватар пользователя'"
      referrerpolicy="no-referrer"
      loading="lazy"
      decoding="async"
      class="w-full h-full object-cover"
      @error="hasImageError = true"
    />
    <span v-else-if="initials" class="uppercase select-none leading-none">
      {{ initials }}
    </span>
    <User
      v-else
      :class="cn('shrink-0 text-current', iconSizeClasses[props.size])"
      :stroke-width="1.75"
      aria-hidden="true"
    />
  </div>
</template>
