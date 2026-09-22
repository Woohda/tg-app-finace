<script setup lang="ts">
/**
 * @module app/components/categories/CategoryBottomSheet
 * @fileoverview Выдвижная нижняя шторка (Bottom Sheet) для выбора категории
 * @description
 * Отображает список категорий с поиском, крупными эмодзи, выделением активного элемента
 * и тактильным откликом Telegram Haptic Feedback.
 */
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { Search, X, Check } from "@lucide/vue";
import { cn } from "~/utils";
import { getHapticFeedback } from "~/utils/haptics";

export interface CategoryOption {
  id: string;
  name: string;
  icon?: string | null;
  type?: string;
}

const props = withDefaults(
  defineProps<{
    isOpen?: boolean;
    categories: CategoryOption[];
    modelValue?: string;
    title?: string;
  }>(),
  {
    isOpen: false,
    modelValue: "",
    title: "Выберите категорию",
  },
);

const emit = defineEmits<{
  (e: "select", category: CategoryOption): void;
  (e: "close"): void;
}>();

const { selection } = getHapticFeedback();

const searchQuery = ref("");
const searchInputRef = ref<HTMLInputElement | null>(null);

const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return props.categories;
  return props.categories.filter((cat) =>
    cat.name.toLowerCase().includes(query),
  );
});

const isSelected = (id: string) => props.modelValue === id;

const handleSelect = (cat: CategoryOption) => {
  selection();
  emit("select", cat);
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
      setTimeout(() => {
        searchInputRef.value?.focus();
      }, 200);
      if (typeof document !== "undefined") {
        document.addEventListener("keydown", onKeydown);
      }
    } else {
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", onKeydown);
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("keydown", onKeydown);
  }
});
</script>

<template>
  <Teleport to="body">
    <!-- Затемнение фона (Backdrop) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-70 bg-black/15 backdrop-blur-[2px]"
        @click="handleClose"
      />
    </Transition>

    <!-- Контейнер шторки -->
    <Transition
      enter-active-class="transition duration-250 ease-out"
      enter-from-class="translate-y-full opacity-0 sm:translate-y-4 sm:scale-95"
      enter-to-class="translate-y-0 opacity-100 sm:translate-y-0 sm:scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100 sm:translate-y-0 sm:scale-100"
      leave-to-class="translate-y-full opacity-0 sm:translate-y-4 sm:scale-95"
    >
      <div
        v-if="isOpen"
        class="fixed inset-x-0 bottom-0 z-75 flex flex-col max-h-[67dvh] max-w-90 sm:max-w-sm mx-auto sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 rounded-t-3xl sm:rounded-3xl glass-milky px-5 pt-3 pb-10 shadow-glass"
      >
        <!-- Мобильный индикатор свайпа (Drag Handle) -->
        <div
          class="w-12 h-1.5 bg-text-secondary/30 rounded-full mx-auto mb-3 shrink-0 cursor-pointer"
          @click="handleClose"
        />

        <!-- Шапка шторки -->
        <div class="flex items-center justify-between pb-3 px-1">
          <h3 class="text-lg font-bold text-text-primary">
            {{ title }}
          </h3>
          <GlassButton
            variant="soft"
            size="sm"
            class="px-2.25 text-text-primary shrink-0"
            @click="handleClose"
          >
            <X :stroke-width="1.5" />
          </GlassButton>
        </div>

        <!-- Поле поиска -->
        <div v-if="categories.length > 3" class="relative mb-3">
          <Search
            class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-secondary pointer-events-none"
          />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Поиск категории..."
            class="w-full rounded-full pl-10 pr-9 py-2 glass-pill text-text-primary text-sm outline-none a11y-focus"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 cursor-pointer"
            @click="searchQuery = ''"
          >
            <X class="size-4" />
          </button>
        </div>

        <!-- Список категорий -->
        <div
          class="overflow-y-auto overscroll-contain flex-1 pr-1 flex flex-col gap-1.5 scrollbar-hide max-h-[50dvh]"
        >
          <GlassButton
            v-for="cat in filteredCategories"
            :key="cat.id"
            variant="soft"
            :class="
              cn(
                'w-full flex items-center justify-between px-3 py-1.5 rounded-2xl transition-all duration-300 cursor-pointer',
                'active:scale-[0.95]',
                isSelected(cat.id)
                  ? 'glass-pill text-text-accent font-semibold'
                  : 'hover:bg-white/40 active:bg-white/60 text-text-primary',
              )
            "
            @click="handleSelect(cat)"
          >
            <div class="flex items-center min-w-0 flex-1 mr-2">
              <div
                :class="
                  cn(
                    'size-8 rounded-full flex items-center justify-center text-sm shrink-0 mr-2 transition-colors shadow-inner glass-pill',
                    isSelected(cat.id)
                      ? ' text-text-accent'
                      : ' text-text-primary',
                  )
                "
              >
                {{ cat.icon || "🏷️" }}
              </div>
              <span class="text-sm font-medium text-left truncate flex-1">
                {{ cat.name }}
              </span>
            </div>

            <!-- Чекмарк выбранного элемента -->
            <div
              v-if="isSelected(cat.id)"
              class="size-6 rounded-full bg-accent-start/10 text-text-accent flex items-center justify-center shrink-0 ml-2"
            >
              <Check class="size-3.5 stroke-2" />
            </div>
          </GlassButton>

          <!-- Пустой результат -->
          <div
            v-if="filteredCategories.length === 0"
            class="py-8 text-center text-text-secondary text-sm"
          >
            Категории не найдены
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
