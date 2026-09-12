import { h, type FunctionalComponent, type HTMLAttributes } from "vue";

/**
 * @module app/composables/useCategoryIcon
 * @fileoverview Композабл для создания Vue-компонента из эмодзи-иконки.
 * @description
 * Возвращает функциональный компонент Vue (VNode), который отрисовывает эмодзи-строку.
 * Это необходимо для того, чтобы динамически передавать эмодзи в теги <component :is="...">,
 * сохраняя все переданные классы и стили (например, для кольцевого графика).
 *
 * @param icon Эмодзи-строка (например: "🍔")
 * @returns Функциональный компонент Vue (VNode)
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
