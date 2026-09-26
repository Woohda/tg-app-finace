<script setup lang="ts">
/**
 * @module app/components/shared/GlassModal
 * @fileoverview Базовый переиспользуемый UI-компонент модального окна в стиле Glassmorphism.
 * @description
 * Предоставляет унифицированную обертку для модальных окон приложения (создание и редактирование
 * транзакций, аналитика категорий, управление подписками и диалоги подтверждения).
 * Поддерживает плавные анимации появления (Transition), позиционирование (`center` / `bottom`),
 * динамическое управление слоями (z-index) и безопасные отступы при открытии экранной клавиатуры.
 * ---
 * ### Логика работы:
 * 1. **Телепортация**: Рендерит содержимое через `<Teleport to="body">` для изоляции контекста наложения.
 * 2. **Управление слоями (z-index)**: Принимает числовой параметр `zIndex` (по умолчанию `Z_INDEX.MODAL_BASE`),
 *    гарантируя корректный порядок отображения вложенных окон без конфликтов CSS.
 * 3. **Адаптация к клавиатуре**: Использует `useKeyboardViewport` для автоматического смещения
 *    модального окна и ограничения `maxHeight` при появлении мобильной клавиатуры.
 * 4. **Блокировка взаимодействия с фоном**:
 *    - Фиксирует скролл страницы (`document.body.style.overflow = "hidden"`).
 *    - Отключает вертикальные свайпы Telegram Mini App (`disableVerticalSwipes`) для предотвращения случайного закрытия шторки приложения.
 * 
 * ### Входные параметры (Props):
 * - `isOpen`: Флаг видимости модального окна (по умолчанию `false`).
 * - `title`: Заголовок в шапке модалки.
 * - `position`: Расположение окна — `"center"` по центру экрана или `"bottom"` в виде нижней шторки (по умолчанию `"center"`).
 * - `showClose`: Отображать ли кнопку закрытия с иконкой крестика (по умолчанию `true`).
 * - `zIndex`: Уровень z-index контейнера оверлея (по умолчанию `Z_INDEX.MODAL_BASE`).
 * 
 * ### События (Emits):
 * - `close`: Вызывается при нажатии на кнопку закрытия, клике по затемненному оверлею или свайпе.
 */
import { computed, watch, onUnmounted } from "vue";
import { cn } from "~/utils/cn";
import { Z_INDEX } from "~/utils/zIndex";
import { X } from "@lucide/vue";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  isOpen?: boolean;
  title?: string;
  position?: "center" | "bottom";
  showClose?: boolean;
  zIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  title: undefined,
  position: "center",
  showClose: true,
  zIndex: Z_INDEX.MODAL_BASE,
});

const emit = defineEmits<{
  (e: "close"): void;
}>();

const close = () => {
  emit("close");
};

const { keyboardHeight, isKeyboardOpen } = useKeyboardViewport();

// Динамические стили контейнера и карточки для безопасного расположения над клавиатурой и слоя отображения
const containerStyle = computed(() => {
  const style: Record<string, string | number> = {
    zIndex: props.zIndex,
  };
  if (isKeyboardOpen.value && keyboardHeight.value > 0) {
    style.paddingBottom = `${keyboardHeight.value + 20}px`;
  }
  return style;
});

const cardStyle = computed(() => {
  if (!isKeyboardOpen.value || keyboardHeight.value <= 0) return undefined;
  return {
    maxHeight: `calc(100dvh - ${keyboardHeight.value + 44}px)`,
  };
});

// Управление блокировкой прокрутки фона и вертикальных свайпов Telegram
watch(
  () => props.isOpen,
  (open) => {
    if (typeof document === "undefined") return;
    if (open) {
      document.body.style.overflow = "hidden";
      window.Telegram?.WebApp?.disableVerticalSwipes?.();
    } else {
      document.body.style.overflow = "";
      window.Telegram?.WebApp?.enableVerticalSwipes?.();
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
    window.Telegram?.WebApp?.enableVerticalSwipes?.();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        :class="
          cn(
            'fixed inset-0 flex p-4 bg-black/10 backdrop-blur-sm transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            position === 'bottom'
              ? 'items-end justify-center sm:items-center'
              : 'items-center justify-center',
          )
        "
        :style="containerStyle"
        @click.self="close"
      >
        <GlassCard
          data-modal-card="true"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'Диалоговое окно'"
          :class="
            cn(
              'w-full max-w-90 mb-2 p-5 flex flex-col gap-3 glass-milky transition-[max-height,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
              'max-h-[85dvh] overflow-y-auto scrollbar-hide',
              position === 'bottom'
                ? 'animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]'
                : 'animate-in zoom-in-95 duration-250',
            )
          "
          :style="cardStyle"
        >
          <div
            v-if="title || showClose || $slots.header"
            class="flex justify-between items-center"
          >
            <slot name="header">
              <h2 v-if="title" class="text-text-primary text-xl font-bold">
                {{ title }}
              </h2>
              <div v-else class="flex-1" />
            </slot>

            <GlassButton
              v-if="showClose"
              variant="soft"
              size="sm"
              aria-label="Закрыть"
              class="px-2.25 text-text-primary shrink-0"
              @click="close"
            >
              <X :stroke-width="1.5" />
            </GlassButton>
          </div>
          <slot />
        </GlassCard>
      </div>
    </Transition>
  </Teleport>
</template>
