<script setup lang="ts">
import { computed } from "vue";
import { liquidWavePath } from "~/utils/svgPaths";

const props = defineProps<{
  value: number;
  label: string;
  amount: string;
}>();

const uid = useId();

const boundedValue = computed(() => Math.min(Math.max(props.value, 0), 100));

// SVG dimensions
const size = 112;

// Расчет Y-координаты поверхности жидкости
const yBase = computed(() => {
  const val = boundedValue.value;
  const minV = 4;
  const maxV = 108;
  return maxV - (val / 100) * (maxV - minV);
});

// Коэффициент высоты волн: 0.35 у дна (0%), 1.0 в центре (50%) и 0.2 у верха (100%)
const ampFactor = computed(() => {
  const p = boundedValue.value / 100;
  const base = 0.35 - 0.15 * p;
  return base + (1 - base) * Math.sin(p * Math.PI);
});

const backWavePath = computed(() => {
  const factor = ampFactor.value;
  const waveLength = 44;
  const startX = -waveLength;
  return liquidWavePath(
    startX,
    yBase.value,
    size + waveLength * 2,
    size + 10,
    2.4 * factor,
    waveLength,
  );
});

const frontWavePath = computed(() => {
  const factor = ampFactor.value;
  const waveLength = 56;
  const startX = -waveLength;
  return liquidWavePath(
    startX,
    yBase.value + 1.8 * factor,
    size + waveLength * 2,
    size + 10,
    3.6 * factor,
    waveLength,
  );
});

// Фиксированный красный фирменный цвет
const liquidColor = "var(--color-accent-mid)";

const isLiquidOverText = computed(() => boundedValue.value >= 45);
</script>

<template>
  <!-- Прозрачная стеклянная сфера с бликами (Transparent Glass Orb) -->
  <div
    class="liquid-sphere relative w-28 h-28 shrink-0 rounded-full border border-white/50 shadow-[0_8px_20px_rgba(15,28,63,0.04),inset_0_1.5px_3px_rgba(255,255,255,0.7),inset_0_-1.5px_3px_rgba(255,255,255,0.3)] backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden"
  >
    <!-- Многослойная анимированная жидкость (Pure SVG) -->
    <svg class="absolute inset-0 w-full h-full" viewBox="0 0 112 112">
      <defs>
        <clipPath :id="uid + '-circle'">
          <circle cx="56" cy="56" r="56" />
        </clipPath>
      </defs>

      <g :clip-path="`url(#${uid}-circle)`">
        <!-- Задняя волна: движется слева направо -->
        <g :fill="liquidColor" opacity="0.45">
          <animateTransform
            attributeName="transform"
            type="translate"
            from="-44 0"
            to="0 0"
            dur="3.2s"
            repeatCount="indefinite"
          />
          <path :d="backWavePath" />
        </g>

        <!-- Передняя волна: движется справа налево -->
        <g :fill="liquidColor" opacity=".95">
          <animateTransform
            attributeName="transform"
            type="translate"
            from="0 0"
            to="-56 0"
            dur="4.2s"
            repeatCount="indefinite"
          />
          <path :d="frontWavePath" />
        </g>
      </g>
    </svg>

    <!-- Текст -->
    <span
      class="relative z-10 text-[10px] font-extrabold uppercase tracking-wider mb-0.5 select-none transition-colors duration-200"
      :class="
        isLiquidOverText
          ? 'text-white/95 drop-shadow-xs'
          : 'text-text-secondary'
      "
    >
      {{ label }}
    </span>
    <span
      class="relative z-10 text-base font-black tracking-tight leading-none drop-shadow-[0_0.3px_0.3px_rgba(0,0,0,0.3)] transition-colors duration-200 select-none"
      :class="
        isLiquidOverText ? 'text-white drop-shadow-sm' : 'text-text-accent'
      "
    >
      {{ amount }}
    </span>

    <!-- Верхний главный блик стекла (линза) -->
    <div
      class="absolute top-1.5 left-3 w-[55%] h-[28%] rounded-[50%] bg-linear-to-b from-white/40 via-white/15 to-transparent rotate-[-15deg] pointer-events-none blur-[0.5px]"
    />
    <!-- Точечный блик источника света -->
    <div
      class="absolute top-3 left-6 w-2 h-1.5 rounded-full bg-white/70 pointer-events-none rotate-[-15deg]"
    />
  </div>
</template>

<style scoped>
.liquid-sphere {
  background: transparent;
  transform: translateZ(0);
}
</style>
