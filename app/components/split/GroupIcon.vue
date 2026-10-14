<script setup lang="ts">
/**
 * @module app/components/split/GroupIcon
 * @fileoverview Векторная SVG-иконка группы совместных расходов
 * @description
 * Отображает стилизованную команду («объятие» из трех участников),
 * соединенных мягким градиентным контуром. Поддерживает кастомизацию размера,
 * толщины линий и опциональное переопределение цвета контура.
 * ---
 * ### Логика работы:
 * 1. Генерация уникального идентификатора градиента через `useId()` для предотвращения конфликтов SVG-дефиниций.
 * 2. Отрисовка объединенных силуэтов команды в координатной сетке 512x512.
 * 3. Применение пастельного градиента по умолчанию (`#fae0e3` -> `#cbeef1` -> `#ded7f5` -> `#bba8ff`).
 * 4. Поддержка масштабирования через Tailwind-классы (`class="size-14"` и т.д.) или проп `size`.
 */
import { useId } from "vue";

interface Props {
  /** Размер иконки (число в px или строка с единицами измерения) */
  size?: number | string;
  /** Толщина обводки в системе координат 512x512 (по умолчанию 9) */
  strokeWidth?: number | string;
  /** Цвет обводки (если передан, заменяет линейный градиент) */
  color?: string;
}

withDefaults(defineProps<Props>(), {
  size: undefined,
  strokeWidth: 9,
  color: undefined,
});

const instanceId = useId();
const gradientId = `split-team-gradient-${instanceId}`;
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    :width="size"
    :height="size"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <defs v-if="!color">
      <linearGradient
        :id="gradientId"
        x1="90"
        y1="40"
        x2="430"
        y2="470"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stop-color="#fae0e3" />
        <stop offset="42%" stop-color="#cbeef1" />
        <stop offset="65%" stop-color="#ded7f5" />
        <stop offset="100%" stop-color="#bba8ff" />
      </linearGradient>
    </defs>

    <g
      :stroke="color || `url(#${gradientId})`"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Голова центрального человека -->
      <circle cx="256" cy="90" r="62" />

      <!-- Центральный человек и объятие (левая часть) -->
      <path
        d="
          M 224 158
          H 190
          C 162 158 142 179 142 208
          C 142 235 157 262 177 284
          C 193 302 211 315 229 321
        "
      />

      <!-- Центральный человек и объятие (правая часть) -->
      <path
        d="
          M 288 158
          H 322
          C 350 158 370 179 370 208
          C 370 235 355 262 335 284
          C 319 302 301 315 283 321
        "
      />

      <!-- Голова левого человека -->
      <circle cx="183" cy="280" r="55" />

      <!-- Голова правого человека -->
      <circle cx="329" cy="280" r="55" />

      <!-- Общий контур объятия -->
      <path
        d="
          M 145 336
          C 113 336 91 359 91 390
          C 91 429 122 456 166 463
          C 202 469 236 457 256 435
          C 276 457 310 469 346 463
          C 390 456 421 429 421 390
          C 421 359 399 336 367 336
          H 350
          L 321 372
          L 292 336
          H 220
          L 191 372
          L 162 336
          Z
        "
      />

      <!-- Нижняя линия, объединяющая фигуры -->
      <path
        d="
          M 91 390
          C 91 429 122 456 166 463
          C 202 469 236 457 256 435
          C 276 457 310 469 346 463
          C 390 456 421 429 421 390
        "
      />
    </g>
  </svg>
</template>
