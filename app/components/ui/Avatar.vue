<script setup lang="ts">
/**
 * @module app/components/ui/Avatar
 * @fileoverview Круглый стеклянный аватар пользователя.
 * @description
 * Отображает картинку, если она есть, иначе fallback эмодзи.
 */
import { User } from "@lucide/vue";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

const avatarVariants = cva(
  "rounded-full glass-milky flex items-center justify-center shrink-0 border-[0.5px] border-white/50 overflow-hidden",
  {
    variants: {
      size: {
        sm: "size-10",
        md: "size-12",
        lg: "size-15",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type AvatarVariants = VariantProps<typeof avatarVariants>;

const props = defineProps<{
  src?: string | null;
  size?: AvatarVariants["size"];
}>();
</script>

<template>
  <div
    :class="avatarVariants({ size: props.size })"
    style="box-shadow: var(--shadow-glass-flat)"
  >
    <img
      v-if="src"
      :src="src"
      alt="Avatar"
      class="w-full h-full object-cover"
    />
    <User v-else class="text-text-primary" :stroke-width="1.75" />
  </div>
</template>
