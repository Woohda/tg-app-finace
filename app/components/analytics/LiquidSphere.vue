<script setup lang="ts">
import { computed } from "vue";
import { liquidWavePath } from "~/utils/svgPaths";

const props = defineProps<{
  value: number;
  label: string;
  amount: string;
}>();

const uid = useId();

// Зафиксировано на 40% для наглядного тестирования эффекта омывания текста волнами
const boundedValue = computed(() => 40);

// SVG dimensions
const size = 112;

// Расчет Y-координаты поверхности жидкости
const yBase = computed(() => {
  const val = boundedValue.value;
  const minV = 5;
  const maxV = 105;
  return maxV - (val / 100) * (maxV - minV);
});

// Генерируем 2 волны для реалистичного параллакс-эффекта
const waves = computed(() => [
  {
    d: liquidWavePath(0, yBase.value + 2, size, size, 5, 150),
    w: 150,
    dur: "7s",
    opacity: 0.85,
    reverse: true,
  },
  {
    d: liquidWavePath(0, yBase.value + 5, size, size, 4, 105),
    w: 105,
    dur: "5.5s",
    opacity: 0.65,
    reverse: false,
  },
]);

// Фиксированный красный фирменный цвет
const liquidColor = "var(--color-accent-mid)";

// Плавная и естественная адаптация размера шрифта для длинных денежных сумм
const amountFontSize = computed(() => {
  const len = props.amount?.length || 1;
  if (len <= 8) return 17;
  if (len <= 11) return 16.5;
  if (len <= 13) return 15.5;
  if (len <= 16) return 14.5;
  return 13.5;
});

// Естественное позиционирование с сохранением вертикального баланса
const textLayout = computed(() => {
  const fs = amountFontSize.value;
  const totalH = 8 + 3.5 + fs * 0.72;
  const yLabel = Math.round((56 - totalH / 2 + 7 - 2) * 10) / 10;
  const yAmount = Math.round((56 + totalH / 2) * 10) / 10;
  return { yLabel, yAmount, fontSize: fs };
});
</script>

<template>
  <!-- Прозрачная стеклянная сфера с бликами (Transparent Glass Orb) -->
  <div
    class="liquid-sphere relative w-28 h-28 shrink-0 rounded-full border border-white/50 shadow-[0_8px_20px_rgba(15,28,63,0.04),inset_0_1.5px_3px_rgba(255,255,255,0.7),inset_0_-1.5px_3px_rgba(255,255,255,0.3)] backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden"
  >
    <!-- Многослойная анимированная жидкость и текст (Pure SVG) -->
    <svg class="absolute inset-0 w-full h-full" viewBox="0 0 112 112">
      <defs>
        <clipPath :id="uid + '-circle'">
          <circle cx="56" cy="56" r="56" />
        </clipPath>

        <!-- Маска для погруженного текста (раскрывает белый цвет там, где проходит жидкость) -->
        <mask
          :id="uid + '-water-mask'"
          maskUnits="userSpaceOnUse"
          x="-10"
          y="-10"
          width="132"
          height="132"
        >
          <rect x="-10" y="-10" width="132" height="132" fill="black" />
          <g fill="white">
            <g v-for="(wave, idx) in waves" :key="idx">
              <animateTransform
                attributeName="transform"
                type="translate"
                :values="
                  wave.reverse ? `${-wave.w} 0; 0 0` : `0 0; ${-wave.w} 0`
                "
                :dur="wave.dur"
                repeatCount="indefinite"
              />
              <path :d="wave.d" />
            </g>
          </g>
        </mask>
      </defs>

      <g :clip-path="`url(#${uid}-circle)`">
        <!-- Анимированные волны жидкости (параллакс с mix-blend-mode: multiply) -->
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

        <!-- 3. Базовый сухой текст (на воздухе: серый заголовок и винный акцент суммы) -->
        <g
          class="select-none pointer-events-none font-sans"
          style="
            font-family: var(--font-sans), sans-serif;
            filter: drop-shadow(0 0.5px 1px rgba(0, 0, 0, 0.1));
          "
        >
          <text
            x="56"
            :y="textLayout.yLabel"
            text-anchor="middle"
            font-size="8"
            font-weight="600"
            letter-spacing="0.15em"
            fill="var(--color-text-secondary)"
          >
            {{ label.toUpperCase() }}
          </text>
          <text
            x="56"
            :y="textLayout.yAmount"
            text-anchor="middle"
            :font-size="textLayout.fontSize"
            font-weight="900"
            letter-spacing="-0.02em"
            fill="var(--color-text-accent)"
          >
            {{ amount }}
          </text>
        </g>

        <!-- 4. Омытый мокрый текст (под волнами: ослепительно белый с мягкой тенью) -->
        <g
          :mask="`url(#${uid}-water-mask)`"
          class="select-none pointer-events-none font-sans"
          style="
            font-family: var(--font-sans), sans-serif;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
          "
        >
          <text
            x="56"
            :y="textLayout.yLabel"
            text-anchor="middle"
            font-size="8"
            font-weight="600"
            letter-spacing="0.15em"
            fill="#ffffff"
            fill-opacity="1"
          >
            {{ label.toUpperCase() }}
          </text>
          <text
            x="56"
            :y="textLayout.yAmount"
            text-anchor="middle"
            :font-size="textLayout.fontSize"
            font-weight="900"
            letter-spacing="-0.02em"
            fill="#ffffff"
          >
            {{ amount }}
          </text>
        </g>
      </g>
    </svg>

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
