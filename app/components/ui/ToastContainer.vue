<script setup lang="ts">
import { useAppToast } from "~/composables/useAppToast";
import { CheckCircle2, AlertCircle, Info, X } from "@lucide/vue";

const { toasts, remove } = useAppToast();

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: "text-green-400",
  error: "text-text-accent",
  info: "text-blue-400",
};
</script>

<template>
  <!-- Контейнер фиксирован поверх всего, z-index 9999 -->
  <div
    class="fixed top-4 left-0 right-0 z-9999 px-4 pointer-events-none flex flex-col items-center gap-3"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="w-full max-w-sm glass-milky rounded-2xl p-4 flex items-center gap-2 shadow-lg pointer-events-auto transition-all"
      >
        <!-- Иконка -->
        <component
          :is="icons[toast.type]"
          class="shrink-0"
          :class="colors[toast.type]"
          :stroke-width="2"
        />

        <!-- Текст -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-text-primary">{{ toast.title }}</p>
          <p
            v-if="toast.message"
            class="text-xs text-text-secondary line-clamp-2"
          >
            {{ toast.message }}
          </p>
        </div>

        <!-- Кнопка закрытия -->
        <button
          class="shrink-0 p-1 text-text-secondary active:scale-95 transition-transform"
          @click="remove(toast.id)"
        >
          <X class="w-5 h-5" :stroke-width="1.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
