<script setup lang="ts" generic="T extends { id: string } = { id: string }">
/**
 * @module app/components/shared/GlassBottomSheet
 * @fileoverview Базовая выдвижная нижняя шторка (Bottom Sheet) в стиле Glassmorphism
 * @description
 * Унифицированный переиспользуемый компонент шторки с поддержкой:
 * - Телепортации в `body` и адаптивного центрирования на десктопах;
 * - Мобильного индикатора свайпа (Drag Handle) и закрытия по клику на оверлей;
 * - Плавных анимаций появления/скрытия со стилями стеклянного морфизма (.glass-milky);
 * - Поля поиска с автофокусом и кнопкой очистки;
 * - Адаптивного отступа при открытии виртуальной клавиатуры через `useKeyboardViewport()`;
 * - Блокировки вертикальных свайпов Telegram WebApp SDK и скролла страницы;
 * - Кастомных слотов `#item` и `#header`.
 */
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { Search, X, Check } from "@lucide/vue";
import { cn } from "~/utils/cn";
import { getHapticFeedback } from "~/utils/haptics";
import { setTelegramVerticalSwipes } from "~/utils/telegram";
import { Z_INDEX } from "~/utils/zIndex";

const props = withDefaults(
  defineProps<{
    isOpen?: boolean;
    items: T[];
    modelValue?: string;
    title?: string;
    searchPlaceholder?: string;
    searchThreshold?: number;
    disabledIds?: string[];
    emptyText?: string;
    itemKey?: (item: T) => string;
    searchFilter?: (item: T, query: string) => boolean;
  }>(),
  {
    isOpen: false,
    modelValue: "",
    title: "Выберите значение",
    searchPlaceholder: "Поиск...",
    searchThreshold: 3,
    disabledIds: () => [],
    emptyText: "Ничего не найдено",
    itemKey: (item: T) => item.id,
    searchFilter: undefined,
  },
);

const emit = defineEmits<{
  (e: "select", item: T): void;
  (e: "close"): void;
}>();

const { selection } = getHapticFeedback();
const { keyboardHeight, isKeyboardOpen } = useKeyboardViewport();

const searchQuery = ref("");
const searchInputRef = ref<HTMLInputElement | null>(null);
const isSearchFocused = ref(false);

const sheetContentStyle = computed(() => {
  const base: Record<string, string | number> = {
    zIndex: Z_INDEX.CATEGORY_SHEET,
  };
  if (
    isSearchFocused.value &&
    isKeyboardOpen.value &&
    keyboardHeight.value > 0
  ) {
    return {
      ...base,
      paddingBottom: `${keyboardHeight.value + 16}px`,
    };
  }
  return base;
});

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.items;
  if (props.searchFilter) {
    return props.items.filter((item) => props.searchFilter!(item, query));
  }
  return props.items.filter((item) => {
    const name = (item as unknown as { name?: string }).name;
    return Boolean(name && String(name).toLowerCase().includes(query));
  });
});

const getItemId = (item: T): string => {
  return props.itemKey ? props.itemKey(item) : item.id;
};

const isSelected = (item: T): boolean => {
  return props.modelValue === getItemId(item);
};

const isItemDisabled = (item: T): boolean => {
  return props.disabledIds.includes(getItemId(item));
};

const handleSelect = (item: T) => {
  if (isItemDisabled(item)) return;
  selection();
  emit("select", item);
};

const handleClose = () => {
  emit("close");
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && props.isOpen) {
    handleClose();
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      searchQuery.value = "";
      isSearchFocused.value = false;
      setTelegramVerticalSwipes(false);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeydown);
      }
    } else {
      isSearchFocused.value = false;
      setTelegramVerticalSwipes(true);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onKeydown);
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("keydown", onKeydown);
    document.body.style.overflow = "";
    setTelegramVerticalSwipes(true);
  }
});
</script>

<template>
  <Teleport to="body">
    <!-- Затемнение фона (Backdrop) -->
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
        class="fixed inset-0 bg-black/15 backdrop-blur-[2px]"
        :style="{ zIndex: Z_INDEX.CATEGORY_SHEET_BACKDROP }"
        @click="handleClose"
      />
    </Transition>

    <!-- Контейнер шторки: плавное скольжение снизу-вверх -->
    <Transition
      enter-active-class="transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-250 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="isOpen"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="fixed inset-x-0 bottom-0 flex flex-col max-h-[72dvh] max-w-90 sm:max-w-sm mx-auto sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 rounded-t-3xl sm:rounded-3xl glass-milky px-5 pt-3 pb-8 shadow-glass transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        :style="sheetContentStyle"
      >
        <!-- Мобильный индикатор свайпа (Drag Handle) -->
        <div
          class="w-12 h-1.5 bg-text-secondary/30 rounded-full mx-auto mb-3 shrink-0 cursor-pointer"
          @click="handleClose"
        />

        <!-- Шапка шторки -->
        <div class="flex items-center justify-between pb-3 px-1">
          <slot name="header" :title="title" :close="handleClose">
            <h3 class="text-lg font-bold text-text-primary">
              {{ title }}
            </h3>
            <GlassButton
              variant="soft"
              size="sm"
              aria-label="Закрыть"
              @click="handleClose"
            >
              <X :stroke-width="1.5" />
            </GlassButton>
          </slot>
        </div>

        <!-- Поле поиска -->
        <div v-if="items.length > searchThreshold" class="relative mb-3">
          <GlassInput
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            :icon="Search"
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
          />
          <button
            v-if="searchQuery"
            type="button"
            aria-label="Очистить поиск"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 cursor-pointer"
            @click="searchQuery = ''"
          >
            <X class="size-5" />
          </button>
        </div>

        <!-- Список элементов -->
        <div
          role="list"
          class="overflow-y-auto overscroll-contain flex-1 pr-1 flex flex-col gap-1.5 scrollbar-hide max-h-[50dvh]"
        >
          <GlassButton
            v-for="item in filteredItems"
            :key="getItemId(item)"
            variant="soft"
            :disabled="isItemDisabled(item)"
            :aria-pressed="isSelected(item)"
            :class="
              cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-300',
                isItemDisabled(item)
                  ? 'opacity-40 cursor-not-allowed pointer-events-none'
                  : 'cursor-pointer active:scale-[0.95]',
                isSelected(item)
                  ? 'glass-pill text-text-accent font-semibold'
                  : 'hover:bg-white/40 active:bg-white/60 text-text-primary',
              )
            "
            @click="handleSelect(item)"
          >
            <!-- Слот элемента -->
            <slot
              name="item"
              :item="item"
              :selected="isSelected(item)"
              :disabled="isItemDisabled(item)"
            >
              <div class="flex items-center min-w-0 flex-1 mr-2">
                <span class="text-[15px] font-medium text-left truncate flex-1">
                  {{ (item as unknown as { name?: string }).name }}
                </span>
              </div>
            </slot>

            <!-- Чекмарк выбранного элемента -->
            <div
              v-if="isSelected(item)"
              class="size-6 rounded-full bg-accent-start/10 text-text-accent flex items-center justify-center shrink-0 ml-2"
            >
              <Check class="size-3.5 stroke-2" />
            </div>
          </GlassButton>

          <!-- Пустой результат -->
          <div
            v-if="filteredItems.length === 0"
            class="py-8 text-center text-text-secondary text-sm"
          >
            {{ emptyText }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
