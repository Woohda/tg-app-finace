<script setup lang="ts">
/**
 * @module app/components/GlassModal
 * @fileoverview Переиспользуемое гласс-модальное окно
 */
import { cn } from "~/utils";
import { X } from "@lucide/vue";

interface Props {
  isOpen?: boolean;
  title?: string;
  position?: "center" | "bottom";
  showClose?: boolean;
}

withDefaults(defineProps<Props>(), {
  isOpen: false,
  title: undefined,
  position: "center",
  showClose: true,
});

const emit = defineEmits<{
  (e: "close"): void;
}>();

const close = () => {
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        :class="
          cn(
            'fixed inset-0 z-60 flex p-4 bg-black/10 backdrop-blur-sm',
            position === 'bottom'
              ? 'items-end justify-center sm:items-center'
              : 'items-center justify-center',
          )
        "
        @click.self="close"
      >
        <GlassCard
          :class="
            cn(
              'w-full max-w-90 mb-3 p-5 flex flex-col gap-5 glass-milky',
              position === 'bottom'
                ? 'animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200'
                : 'animate-in zoom-in-95 duration-200',
            )
          "
        >
          <div
            v-if="title || showClose || $slots.header"
            class="flex justify-between items-center"
          >
            <slot name="header">
              <h2 v-if="title" class="text-text-primary text-xl font-bold">
                {{ title }}
              </h2>
              <div v-else class="flex-1" />
            </slot>

            <GlassButton
              v-if="showClose"
              variant="soft"
              size="sm"
              class="px-2 text-text-primary shrink-0"
              @click="close"
            >
              <X :stroke-width="1.5" />
            </GlassButton>
          </div>
          <slot />
        </GlassCard>
      </div>
    </Transition>
  </Teleport>
</template>
