<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  value: number; // 0 to 100
  label: string;
  amount: string;
  color?: "accent" | "green";
}>();

const boundedValue = computed(() => Math.min(Math.max(props.value, 0), 100));

const liquidClassBase = computed(() =>
  props.color === "green" ? "bg-accent-success" : "bg-accent-mid",
);
</script>

<template>
  <!-- Объемная сфера -->
  <div
    class="relative w-28 h-28 shrink-0 rounded-full overflow-hidden border border-white/15 shadow-[0_10px_20px_rgba(0,0,0,0.15),inset_0_-8px_16px_rgba(0,0,0,0.25),inset_0_6px_12px_rgba(255,255,255,0.1)] bg-transparent backdrop-blur-sm flex flex-col items-center justify-center safari-clip-fix"
  >
    <!-- Подсветка жидкости со дна -->
    <div
      class="absolute bottom-0 w-full h-1/2 opacity-30 blur-[15px]"
      :class="liquidClassBase"
    />

    <!-- Многослойная жидкость -->
    <!-- Задняя волна (очень медленная, прозрачная) -->
    <div
      class="absolute w-[200%] h-[200%] rounded-[46%] animate-wave-slow transition-all duration-1000 ease-out opacity-45 mix-blend-multiply"
      :class="liquidClassBase"
      :style="{ top: `${100 - boundedValue}%`, left: '-50%' }"
    />
    <!-- Средняя волна (плавная) -->
    <div
      class="absolute w-[200%] h-[200%] rounded-[44%] animate-wave-medium transition-all duration-1000 ease-out opacity-65 mix-blend-multiply"
      :class="liquidClassBase"
      :style="{ top: `${100 - boundedValue + 2}%`, left: '-50%' }"
    />
    <!-- Передняя волна (основная) -->
    <div
      class="absolute w-[200%] h-[200%] rounded-[42%] animate-wave-fast transition-all duration-1000 ease-out opacity-90"
      :class="liquidClassBase"
      :style="{ top: `${100 - boundedValue + 4}%`, left: '-50%' }"
    />

    <!-- Текст -->
    <span
      class="relative z-10 text-[10px] font-extrabold uppercase tracking-widest text-white/90 drop-shadow-md mb-0.5"
    >
      {{ label }}
    </span>
    <span
      class="relative z-10 text-base font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-tighter leading-none"
    >
      {{ amount }}
    </span>

    <!-- Глянцевый блик (Стекло) -->
    <div
      class="absolute top-1 left-[15%] w-[70%] h-[30%] rounded-[50%] bg-linear-to-b from-white/0 to-transparent pointer-events-none"
    />
    <!-- Отражение на дне -->
    <div
      class="absolute bottom-0 w-full h-[25%] bg-linear-to-t from-white/25 to-transparent pointer-events-none mix-blend-overlay"
    />
  </div>
</template>

<style scoped>
.safari-clip-fix {
  /* Safari fix for overflow: hidden with border-radius and CSS transforms */
  -webkit-mask-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
  mask-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  transform: translateZ(0);
}
@keyframes wave-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.animate-wave-slow {
  animation: wave-spin 13s linear infinite;
}
.animate-wave-medium {
  animation: wave-spin 10s linear infinite reverse;
}
.animate-wave-fast {
  animation: wave-spin 8s linear infinite;
}
</style>
