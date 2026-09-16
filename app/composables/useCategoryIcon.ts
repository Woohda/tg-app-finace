import { h, type FunctionalComponent, type HTMLAttributes } from "vue";

/**
 * @module app/composables/useCategoryIcon
 * @fileoverview Обертка для иконок-эмодзи
 * 
 * @description
 * Возвращает функциональный компонент Vue (VNode), который отрисовывает переданное эмодзи.
 * Нужно для динамической передачи эмодзи в теги `<component :is="...">` с сохранением
 * переданных классов и стилей (например, для кольцевого графика).
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
