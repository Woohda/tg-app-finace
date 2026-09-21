/**
 * @module app/utils/svgPaths
 * @fileoverview Утилиты для генерации сложных SVG путей
 */

/**
 * SVG path для скруглённого прямоугольника с разными радиусами
 * сверху (rTop) и снизу (rBot). Используется для формы колбы.
 */
export function flaskPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rTop: number,
  rBot: number,
): string {
  const rt = Math.min(rTop, w / 2, h / 2);
  const rb = Math.min(rBot, w / 2, h / 2);
  return [
    `M ${x + rt},${y}`,
    `H ${x + w - rt}`,
    `A ${rt},${rt} 0 0 1 ${x + w},${y + rt}`,
    `V ${y + h - rb}`,
    `A ${rb},${rb} 0 0 1 ${x + w - rb},${y + h}`,
    `H ${x + rb}`,
    `A ${rb},${rb} 0 0 1 ${x},${y + h - rb}`,
    `V ${y + rt}`,
    `A ${rt},${rt} 0 0 1 ${x + rt},${y}`,
    "Z",
  ].join(" ");
}

/**
 * SVG path для жидкости с волнистым верхним краем.
 * Рассчитывает необходимое количество волн на основе waveLength для бесшовной анимации.
 */
export function liquidWavePath(
  x: number,
  y: number,
  w: number,
  bottom: number,
  amp: number = 4,
  waveLength: number = 50,
): string {
  const startX = x;
  // Рассчитываем количество полных волн, чтобы покрыть ширину столбца + один сдвиг
  const fullWaves = Math.ceil((w + waveLength) / waveLength);
  const count = fullWaves * 2; // количество полуволн
  const halfW = waveLength / 2;

  let d = `M ${startX},${y}`;
  for (let i = 0; i < count; i++) {
    const sx = startX + i * halfW;
    const ex = sx + halfW;
    const cpx1 = sx + halfW / 3;
    const cpx2 = sx + (halfW * 2) / 3;
    const dy = i % 2 === 0 ? -amp : amp;
    d += ` C ${cpx1},${y + dy} ${cpx2},${y + dy} ${ex},${y}`;
  }

  d += ` V ${bottom} H ${startX} Z`;
  return d;
}
