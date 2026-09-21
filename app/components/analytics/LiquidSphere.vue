<script setup lang="ts">
import { computed } from "vue";
import { liquidWavePath } from "~/utils/svgPaths";

const props = defineProps<{
  value: number;
  label: string;
  amount: string;
  color?: "accent" | "green";
}>();

const uid = useId();

const boundedValue = computed(() => Math.min(Math.max(props.value, 0), 100));

// SVG dimensions
const size = 112;

// Расчет Y-координаты поверхности жидкости
const yBase = computed(() => {
  // Немного сдвигаем границы, чтобы при 0% и 100% жидкость выглядела красиво
  const val = boundedValue.value;
  const minV = 5;
  const maxV = 105;
  return maxV - (val / 100) * (maxV - minV);
});

// Генерируем 3 волны для реалистичного параллакс-эффекта
const waves = computed(() => [
  {
    d: liquidWavePath(0, yBase.value + 2, size, size, 5, 150),
    w: 150,
    dur: "5s",
    opacity: 0.85,
    reverse: true,
  },
  {
    d: liquidWavePath(0, yBase.value + 5, size, size, 4, 90),
    w: 90,
    dur: "3.5s",
    opacity: 0.55,
    reverse: false,
  },
]);

const liquidColor = "var(--color-accent-mid)";
</script>

<template>
  <!-- Объемная сфера -->
  <div
    class="relative w-28 h-28 shrink-0 rounded-full border border-white/15 shadow-[0_10px_20px_rgba(0,0,0,0.15),inset_0_-8px_16px_rgba(0,0,0,0.25),inset_0_6px_12px_rgba(255,255,255,0.1)] bg-transparent backdrop-blur-sm flex flex-col items-center justify-center"
  >
    <!-- Подсветка жидкости со дна -->
    <div
      class="absolute bottom-0 w-full h-1/2 opacity-30 blur-[15px]"
      :style="{ backgroundColor: liquidColor }"
    />

    <!-- Многослойная жидкость (Pure SVG) -->
    <svg class="absolute inset-0 w-full h-full" viewBox="0 0 112 112">
      <defs>
        <clipPath :id="uid + '-circle'">
          <circle cx="56" cy="56" r="56" />
        </clipPath>
      </defs>
      <g :clip-path="`url(#${uid}-circle)`">
        <g
          v-for="(wave, idx) in waves"
          :key="idx"
          :opacity="wave.opacity"
          :fill="liquidColor"
          style="mix-blend-mode: multiply"
        >
          <animateTransform
            attributeName="transform"
            type="translate"
            :values="wave.reverse ? `${-wave.w} 0; 0 0` : `0 0; ${-wave.w} 0`"
            :dur="wave.dur"
            repeatCount="indefinite"
          />
          <path :d="wave.d" />
        </g>
      </g>
    </svg>

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
      class="absolute top-1 left-[15%] w-[70%] h-[30%] rounded-[50%] bg-linear-to-b from-white/20 to-transparent pointer-events-none"
    />
    <!-- Отражение на дне -->
    <div
      class="absolute bottom-0 w-full h-[25%] bg-linear-to-t from-white/25 to-transparent pointer-events-none mix-blend-overlay rounded-b-full"
    />
  </div>
</template>

<style scoped>
.liquid-sphere-safari-fix {
  transform: translateZ(0);
}
</style>
