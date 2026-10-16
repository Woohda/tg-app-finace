<script setup lang="ts">
/**
 * @module app/components/subscription/SubscriptionFormModal
 * @fileoverview Модальное окно для создания/редактирования регулярных платежей
 * @description
 * Предоставляет форму создания или обновления регулярного платежа:
 * название, сумма, день месяца (1–31) и категория расходов.
 * ---
 * ### Логика работы:
 * 1. Инициализирует поля формы (в режиме создания устанавливает день через `getDayOfMonth()`).
 * 2. Выполняет клиентскую валидацию через Zod-схему `subscriptionSchema`.
 * 3. Отправляет запрос на создание (`createSubscription`) или обновление (`updateSubscription`).
 */
import { ref, computed, watch } from "vue";
import { Calendar, RussianRuble, Plus, Sparkles } from "@lucide/vue";
import {
  validateSubscriptionForm,
  isSubscriptionFormValid,
  getNameInputError,
  getAmountInputError,
  getDayOfMonthInputError,
} from "~/utils/validation";
import type { Subscription } from "~/composables/useSubscriptions";

const props = defineProps<{
  isOpen: boolean;
  isEditMode: boolean;
  subscription?: Subscription | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { categories, fetchCategories } = useCategories();
const { createSubscription, updateSubscription } = useSubscriptions();

const name = ref("");
const amount = ref<string | number>("");
const dayOfMonth = ref<number | "">("");
const categoryId = ref<string>("");
const errorMsg = ref("");
const buttonState = ref<"idle" | "loading" | "success">("idle");
const isSubmitting = ref(false);

const nameInputRef = ref<{ focus: () => void } | null>(null);

const expenseCategories = computed(() =>
  categories.value.filter((c) => c.type === "expense"),
);

const isFormValid = computed(() => {
  return isSubscriptionFormValid(name.value, amount.value, dayOfMonth.value);
});

const isSubmitDisabled = computed(() => {
  return (
    !isFormValid.value || buttonState.value !== "idle" || isSubmitting.value
  );
});

const displayError = computed(() => {
  const nameErr = getNameInputError(name.value);
  if (nameErr) return nameErr;

  const amountErr = getAmountInputError(amount.value);
  if (amountErr) return amountErr;

  const dayErr = getDayOfMonthInputError(dayOfMonth.value);
  if (dayErr) return dayErr;

  return errorMsg.value;
});

watch([name, amount, dayOfMonth], () => {
  if (errorMsg.value) {
    errorMsg.value = "";
  }
});

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      fetchCategories();
      errorMsg.value = "";
      buttonState.value = "idle";

      if (props.isEditMode && props.subscription) {
        name.value = props.subscription.name;
        amount.value = props.subscription.amount;
        dayOfMonth.value = props.subscription.day_of_month;
        categoryId.value = props.subscription.category_id || "";
      } else {
        name.value = "";
        amount.value = "";
        dayOfMonth.value = getDayOfMonth();
        categoryId.value = "";
      }

      setTimeout(() => {
        nameInputRef.value?.focus();
      }, 380);
    }
  },
  { immediate: true },
);

const submit = async () => {
  if (buttonState.value === "loading" || !isFormValid.value) return;

  const parseResult = validateSubscriptionForm({
    name: name.value,
    amount: amount.value,
    dayOfMonth: dayOfMonth.value,
    categoryId: categoryId.value || null,
  });

  if (!parseResult.success) {
    errorMsg.value = parseResult.error;
    return;
  }

  errorMsg.value = "";
  buttonState.value = "loading";
  isSubmitting.value = true;

  try {
    let res: { success: boolean; error?: string };

    if (props.isEditMode && props.subscription) {
      res = await updateSubscription(props.subscription.id, {
        name: parseResult.data.name,
        amount: parseResult.data.amount,
        day_of_month: parseResult.data.day_of_month,
        category_id: parseResult.data.category_id,
      });
    } else {
      res = await createSubscription({
        name: parseResult.data.name,
        amount: parseResult.data.amount,
        day_of_month: parseResult.data.day_of_month,
        category_id: parseResult.data.category_id,
      });
    }

    if (res.success) {
      buttonState.value = "success";
      setTimeout(() => {
        emit("saved");
        emit("close");
      }, 400);
    } else {
      buttonState.value = "idle";
      errorMsg.value = res.error || "Не удалось сохранить платёж";
    }
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    position="bottom"
    :title="isEditMode ? 'Редактировать платёж' : 'Новый регулярный платёж'"
    :z-index="Z_INDEX.SUBSCRIPTION_FORM"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <!-- Название -->
      <GlassInput
        ref="nameInputRef"
        v-model="name"
        type="text"
        label="Название платежа"
        placeholder="Например, Интернет, Ипотека, Фитнес"
        :icon="Sparkles"
      />

      <!-- Сумма -->
      <GlassInput
        v-model="amount"
        type="text"
        inputmode="decimal"
        step="0.01"
        label="Сумма списания"
        placeholder="0.00"
        :icon="RussianRuble"
      />

      <!-- День месяца списания -->
      <div class="flex flex-col gap-1">
        <GlassInput
          v-model="dayOfMonth"
          type="number"
          min="1"
          max="31"
          label="Число списания (день месяца)"
          placeholder="Например, 15"
          :icon="Calendar"
        />
        <span class="text-[11px] text-text-secondary pl-2">
          Списание каждого {{ dayOfMonth ? dayOfMonth : "N" }}-го числа месяца
        </span>
      </div>

      <!-- Категория -->
      <div class="flex flex-col gap-1">
        <label class="text-xs font-bold text-text-primary pl-2">
          Категория расхода
        </label>
        <GlassCategorySelect
          v-model="categoryId"
          :categories="expenseCategories"
          placeholder="Выберите категорию (опционально)"
        />
      </div>

      <div
        v-if="displayError"
        class="text-text-accent text-xs font-medium text-center"
      >
        {{ displayError }}
      </div>

      <!-- Кнопка сохранения -->
      <GlassMorphButton
        type="submit"
        variant="primary"
        :state="buttonState"
        :disabled="isSubmitDisabled"
      >
        <span v-if="isEditMode">Сохранить изменения</span>
        <span v-else class="flex gap-px items-center">
          <Plus class="size-5" :stroke-width="2" />
          <span>Добавить регулярный платёж</span>
        </span>

        <template v-if="!isEditMode" #success>
          <RussianRuble :stroke-width="2" />
        </template>
      </GlassMorphButton>
    </form>
  </GlassModal>
</template>
