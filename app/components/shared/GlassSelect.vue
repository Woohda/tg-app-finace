<script setup lang="ts">
/**
 * @module app/components/shared/GlassSelect
 * @fileoverview Базовый селект-триггер в стиле Glassmorphism
 * @description
 * Предоставляет стилизованную кнопку-триггер селектора с плавной анимацией шеврона,
 * обработкой фокуса клавиатуры и слотами для иконки, текста и нижней шторки (Bottom Sheet).
 * ---
 * ### Логика работы:
 * 1. Управление состоянием открытия шторки через двусторонний биндинг `v-model:is-open`.
 * 2. Автоматическое скрытие виртуальной клавиатуры перед открытием диалоговой шторки.
 * 3. Поддержка кастомных слотов `#icon`, `#default` и `#sheet`.
 */
import { ref, computed } from "vue";
import { ChevronDown } from "@lucide/vue";
import { cn } from "~/utils/cn";

const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    displayText?: string;
    selected?: boolean;
    disabled?: boolean;
    isOpen?: boolean;
    ariaLabel?: string;
  }>(),
  {
    label: undefined,
    placeholder: "Выберите значение",
    displayText: undefined,
    selected: false,
    disabled: false,
    isOpen: undefined,
    ariaLabel: undefined,
  },
);

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "open" | "close"): void;
}>();

const { isKeyboardOpen } = useKeyboardViewport();
const internalIsOpen = ref(false);

const isSheetOpen = computed({
  get: () => (props.isOpen !== undefined ? props.isOpen : internalIsOpen.value),
  set: (value: boolean) => {
    internalIsOpen.value = value;
    emit("update:isOpen", value);
    if (value) {
      emit("open");
    } else {
      emit("close");
    }
  },
});

const open = () => {
  if (props.disabled) return;
  // Снимаем фокус с любого активного инпута, чтобы клавиатура закрылась до показа шторки
  if (
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }
  // Если клавиатура открыта, даем ей время скрыться перед началом плавной анимации шторки
  if (isKeyboardOpen.value) {
    setTimeout(() => {
      isSheetOpen.value = true;
    }, 220);
  } else {
    isSheetOpen.value = true;
  }
};

const close = () => {
  isSheetOpen.value = false;
};
</script>

<template>
  <div class="relative w-full flex flex-col gap-1">
    <!-- Лейбл поля (если передан) -->
    <label v-if="label" class="text-sm font-bold text-text-primary pl-3">
      {{ label }}
    </label>

    <!-- Кнопка-триггер селектора -->
    <button
      type="button"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isSheetOpen"
      :aria-label="
        ariaLabel ||
        (label
          ? `${label}: ${displayText || placeholder}`
          : displayText || placeholder)
      "
      :class="
        cn(
          'relative w-full text-left flex items-center justify-between rounded-full px-4 py-2.75 glass-pill',
          'transition-all duration-300 transform-gpu cursor-pointer',
          'focus:outline-none a11y-focus focus:shadow-[0_4px_20px_rgba(225,29,72,0.3)]!',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'active:scale-[0.99] hover:bg-white/50',
          selected ? 'opacity-100' : 'opacity-80',
        )
      "
      @click="open"
    >
      <div class="flex items-center min-w-0 flex-1 mr-2">
        <slot name="icon" />

        <slot>
          <span
            :class="
              cn(
                'font-medium text-base truncate flex-1 min-w-0',
                selected ? 'text-text-primary' : 'text-text-secondary',
              )
            "
          >
            {{ displayText || placeholder }}
          </span>
        </slot>
      </div>

      <slot name="right" :is-open="isSheetOpen">
        <ChevronDown
          :class="
            cn(
              'mt-1 size-5 text-text-primary shrink-0 transition-transform duration-300',
              isSheetOpen && 'rotate-180 text-text-accent',
            )
          "
        />
      </slot>
    </button>

    <!-- Слот для вынесенной шторки/диалога -->
    <slot name="sheet" :is-open="isSheetOpen" :close="close" :open="open" />
  </div>
</template>
