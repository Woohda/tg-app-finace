import { h, type FunctionalComponent, type HTMLAttributes } from "vue";

/**
 * @module app/composables/useCategoryIcon
 * @fileoverview Композабл для создания Vue-компонента из эмодзи-иконки.
 * @description
 * Возвращает функциональный компонент Vue (VNode), который отрисовывает эмодзи-строку.
 * Это необходимо для того, чтобы динамически передавать эмодзи в теги `<component :is="...">`,
 * сохраняя все переданные классы и стили (например, для кольцевого графика).
 * ---
 * ### Логика работы:
 * 1. Принимает строку (эмодзи)
 * 2. Оборачивает ее в VNode (`span`) с помощью функции `h()`
 * 3. Проксирует переданные HTML атрибуты в VNode
 *
 * ### API:
 * - `icon`: Эмодзи-строка (например: "🍔")
 * - Возвращает: `FunctionalComponent<HTMLAttributes>`
 * 
 * ### Зависимости:
 * - Функции Vue: `h`, `FunctionalComponent`, `HTMLAttributes`
 */
export function useCategoryIcon(
  icon: string,
): FunctionalComponent<HTMLAttributes> {
  return (props: HTMLAttributes) =>
    h(
      "span",
      {
        class: props.class,
        style: [
          props.style as unknown,
          {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          },
        ],
      },
      icon,
    );
}
