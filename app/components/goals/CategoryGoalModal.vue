<script setup lang="ts">
/**
 * @module app/components/goals/CategoryGoalModal
 * @fileoverview Модальное окно создания и редактирования цели трат по категории
 * @description
 * Предоставляет форму создания нового лимита трат с выбором категории или редактирования
 * существующего лимита с возможностью удаления. Используется на экране бюджета.
 * ---
 * ### Логика работы:
 * 1. Инициализирует состояние формы в зависимости от режима (`isEdit` / создание).
 * 2. Предоставляет селект категории при создании и отображает бейдж категории при редактировании.
 * 3. Валидирует сумму лимита (положительное число, не более 100 млн).
 * 4. Сохраняет или удаляет цель через `useCategoryGoals` с анимацией морфинга кнопки.
 */
import { ref, watch, computed } from "vue";
import { Target, RussianRuble } from "@lucide/vue";
import type { CategoryOption } from "~/components/categories/CategoryBottomSheet.vue";
import { getHapticFeedback } from "~/utils/haptics";
import { Z_INDEX } from "~/utils/zIndex";

interface Props {
  isOpen: boolean;
  isEdit: boolean;
  initialCategoryId?: string | null;
  initialCategoryName?: string;
  initialCategoryIcon?: string;
  initialAmount?: number;
  availableCategories?: CategoryOption[];
}

const props = withDefaults(defineProps<Props>(), {
  initialCategoryId: null,
  initialCategoryName: "",
  initialCategoryIcon: "📂",
  initialAmount: undefined,
  availableCategories: () => [],
});

const emit = defineEmits<{
  (e: "close" | "saved"): void;
}>();

const { setGoal } = useCategoryGoals();
const haptics = getHapticFeedback();

const categoryId = ref<string>("");
const amountInput = ref<string | number>("");
const formError = ref<string | null>(null);
const isSubmitting = ref(false);
const buttonState = ref<"idle" | "loading" | "success">("idle");

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      categoryId.value =
        props.initialCategoryId || (props.availableCategories[0]?.id ?? "");
      amountInput.value = props.initialAmount
        ? String(props.initialAmount)
        : "";
      formError.value = null;
      buttonState.value = "idle";
      isSubmitting.value = false;
    }
  },
  { immediate: true },
);

watch([categoryId, amountInput], () => {
  if (formError.value) {
    formError.value = null;
  }
});

const isSubmitDisabled = computed(() => {
  return isSubmitting.value || buttonState.value !== "idle";
});

const selectedCategory = computed(() => {
  if (props.isEdit) {
    return {
      id: props.initialCategoryId || "",
      name: props.initialCategoryName || "Категория",
      icon: props.initialCategoryIcon || "📂",
    };
  }
  return (
    props.availableCategories.find((c) => c.id === categoryId.value) || null
  );
});

const handleSave = async () => {
  if (buttonState.value !== "idle" || isSubmitting.value) return;

  const targetCategory = props.isEdit
    ? props.initialCategoryId
    : categoryId.value;
  if (!targetCategory) {
    formError.value = "Выберите категорию расходов";
    haptics.notification("error");
    return;
  }

  const raw = String(amountInput.value ?? "").trim();
  if (!raw) {
    formError.value = "Укажите сумму лимита";
    haptics.notification("error");
    return;
  }

  const num = Number(raw);
  if (isNaN(num) || num <= 0) {
    formError.value = "Сумма должна быть больше 0";
    haptics.notification("error");
    return;
  }

  if (num > 100_000_000) {
    formError.value = "Сумма не может превышать 100 млн";
    haptics.notification("error");
    return;
  }

  formError.value = null;
  isSubmitting.value = true;
  buttonState.value = "loading";

  const success = await setGoal(targetCategory, Math.round(num));
  isSubmitting.value = false;

  if (success) {
    buttonState.value = "success";
    setTimeout(() => {
      buttonState.value = "idle";
      emit("saved");
      emit("close");
    }, 600);
  } else {
    buttonState.value = "idle";
  }
};

const close = () => {
  emit("close");
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    position="bottom"
    :z-index="Z_INDEX.MODAL_BASE"
    @close="close"
  >
    <template #header>
      <div class="flex items-center gap-2.5">
        <div class="p-2 rounded-full glass-pill text-text-accent shadow-xs">
          <Target class="w-6 h-6" />
        </div>
        <div class="flex flex-col min-w-0">
          <h2
            class="text-text-primary text-base font-bold tracking-wide truncate"
          >
            {{ isEdit ? "Изменение цели" : "Новая цель по категории" }}
          </h2>
          <p class="text-text-secondary text-xs">
            {{
              isEdit
                ? "Обновите лимит расходов"
                : "Задайте месячный лимит расходов"
            }}
          </p>
        </div>
      </div>
    </template>

    <form class="flex flex-col gap-4 mt-1" @submit.prevent="handleSave">
      <!-- Режим редактирования: отображение текущей категории -->
      <div
        v-if="isEdit && selectedCategory"
        class="flex items-center gap-3 py-2 px-3 rounded-4xl glass-pill"
      >
        <div
          class="w-9 h-9 flex items-center justify-center glass-pill rounded-full text-lg shrink-0"
        >
          {{ selectedCategory.icon || "📂" }}
        </div>
        <div class="flex flex-col min-w-0">
          <span
            class="text-text-secondary text-[11px] font-semibold uppercase tracking-wider"
          >
            Категория
          </span>
          <span class="text-text-primary font-bold text-sm truncate">
            {{ selectedCategory.name }}
          </span>
        </div>
      </div>

      <!-- Режим добавления: выбор категории -->
      <div v-else class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-text-primary pl-2">
          Категория расходов
        </label>
        <div v-if="availableCategories.length > 0">
          <GlassCategorySelect
            v-model="categoryId"
            :categories="availableCategories"
            placeholder="Выберите категорию"
          />
        </div>
        <div
          v-else
          class="text-xs text-text-secondary p-3 rounded-2xl glass-milky text-center"
        >
          Все ваши категории расходов уже имеют установленные цели
        </div>
      </div>

      <!-- Поле ввода суммы лимита -->
      <GlassInput
        v-model="amountInput"
        type="number"
        step="1"
        inputmode="numeric"
        label="Месячный лимит"
        placeholder="Например, 15000"
        :icon="RussianRuble"
      />

      <div v-if="formError" class="text-text-accent text-xs font-semibold px-2">
        {{ formError }}
      </div>

      <!-- Кнопки действий -->
      <div class="flex items-center gap-2">
        <GlassButton
          type="button"
          variant="soft"
          size="sm"
          class="flex-1 h-10 shadow-xs text-[15px]"
          @click="close"
        >
          Отмена
        </GlassButton>

        <GlassMorphButton
          type="submit"
          variant="primary"
          size="sm"
          :state="buttonState"
          :disabled="
            isSubmitDisabled || (!isEdit && availableCategories.length === 0)
          "
          class="flex-1"
        >
          <span class="text-[15px] font-semibold">Сохранить</span>
        </GlassMorphButton>
      </div>
    </form>
  </GlassModal>
</template>
