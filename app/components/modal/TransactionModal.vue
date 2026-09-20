<script setup lang="ts">
/**
 * @module app/components/modal/TransactionModal
 * @fileoverview Глобальное модальное окно создания/редактирования транзакций.
 * @description
 * Обеспечивает форму добавления новой транзакции или редактирования существующей.
 * Интегрировано с `useTransactionModal` (глобальный стейт) для вызова из любой точки приложения.
 * Поддерживает парсинг чеков (переход на камеру) и валидацию данных через Zod.
 * ---
 * ### Логика работы:
 * 1. Управляется глобальным стейтом `useTransactionModal`.
 * 2. Если `editId` задан, работает в режиме редактирования (загружает данные транзакции).
 * 3. Отправляет данные через `useTransactions().addTransaction` или `updateTransaction`.
 */
import { ref, computed, watch, onUnmounted } from "vue";
import { useRouter } from "vue-router";

import { Calendar, RussianRuble, Camera } from "@lucide/vue";
import { transactionFrontendSchema } from "~/types/validate";
import { formatZodError } from "~/utils/zod";

const router = useRouter();
const toast = useAppToast();
const notifications = useNotifications();

const { addTransaction, updateTransaction, transactions } = useTransactions();
const { isOpen, editId, closeModal } = useTransactionModal();

const isEditMode = computed(() => !!editId.value);

const type = ref<"expense" | "income">("expense");
const amount = ref<number | "">("");
const categoryId = ref<string>("");
const name = ref<string>("");
const date = ref<string>(new Date().toISOString().split("T")[0] as string); // YYYY-MM-DD

const { categories, isLoading: pending, fetchCategories } = useCategories();
const globalLoading = useGlobalLoading();

watch(
  pending,
  (val) => {
    globalLoading.value = val;
  },
  { immediate: true },
);

onUnmounted(() => {
  globalLoading.value = false;
});

const amountInputRef = ref<{ focus: () => void } | null>(null);

// Сброс формы и фокус при открытии/закрытии модалки
watch(isOpen, (newVal) => {
  if (newVal) {
    fetchCategories();
    setTimeout(() => {
      amountInputRef.value?.focus();
    }, 100);
  } else {
    // сбрасываем данные при закрытии
    setTimeout(() => {
      type.value = "expense";
      amount.value = "";
      categoryId.value = "";
      name.value = "";
      date.value = new Date().toISOString().split("T")[0] as string;
      buttonState.value = "idle";
      errorMsg.value = "";
    }, 300);
  }
});

const filteredCategories = computed(() => {
  return categories.value.filter((c) => c.type === type.value);
});

const buttonState = ref<"idle" | "loading" | "success">("idle");
const errorMsg = ref("");

watch(
  [editId, transactions, isOpen],
  () => {
    if (!isOpen.value) return;

    if (editId.value) {
      const tx = transactions.value.find((t) => t.id === editId.value);
      if (tx) {
        type.value = tx.type;
        amount.value = tx.amount;
        categoryId.value = tx.categoryId;
        name.value = tx.name || "";
        date.value = tx.date;
      }
    }
  },
  { immediate: true },
);

const submit = async () => {
  const result = transactionFrontendSchema.safeParse({
    amount: Number(amount.value),
    categoryId: categoryId.value,
    date: date.value,
    type: type.value,
    name: name.value,
  });

  if (!result.success) {
    errorMsg.value = formatZodError(result.error);
    return;
  }

  errorMsg.value = "";
  buttonState.value = "loading";

  let res: { success: boolean; error?: string };

  const txData = {
    amount: result.data.amount,
    category_id: result.data.categoryId,
    type: result.data.type,
    date: result.data.date,
    name: result.data.name || undefined,
  };

  if (isEditMode.value && editId.value) {
    res = await updateTransaction(editId.value, txData);
  } else {
    res = await addTransaction(txData);
  }

  if (res.success) {
    buttonState.value = "success";
    toast.success(
      isEditMode.value ? "Изменения сохранены" : "Транзакция добавлена",
    );

    // Пишем в историю уведомлений
    if (!isEditMode.value) {
      notifications.add(type.value === "expense" ? "Трата" : "Пополнение", {
        message: `${name.value || "Без названия"}: ${amount.value} ₽`,
        type: type.value,
      });
    }

    setTimeout(() => {
      closeModal();
      if (!isEditMode.value) {
        router.push("/");
      }
    }, 1000);
  } else {
    buttonState.value = "idle";
    const errText = res.error || "Ошибка при сохранении";
    errorMsg.value = errText;
    toast.error("Не удалось сохранить", errText);
  }
};

watch(type, () => {
  if (!isEditMode.value) {
    categoryId.value = "";
  }
});

const { fileInput, isScanning, scanError, triggerScan, handleFileUpload } =
  useReceiptScanner();
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    position="bottom"
    :title="isEditMode ? 'Редактирование' : 'Новая операция'"
    @close="closeModal"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <!-- Amount -->
      <GlassInput
        ref="amountInputRef"
        v-model="amount"
        type="text"
        inputmode="decimal"
        step="0.01"
        label="Сумма"
        placeholder="0.00"
        :icon="RussianRuble"
      />

      <!-- Category -->
      <div class="flex flex-col gap-1">
        <label class="text-xs font-bold text-text-primary pl-2"
          >Категория</label
        >
        <GlassCategorySelect
          v-model="categoryId"
          :categories="filteredCategories"
        />
      </div>

      <!-- Date -->
      <GlassInput v-model="date" type="date" label="Дата" :icon="Calendar" />

      <!-- Name -->
      <GlassInput
        v-model="name"
        type="text"
        label="Комментарий"
        placeholder="Например, Обед с коллегами"
      />

      <div
        v-if="errorMsg"
        class="text-text-accent text-sm font-medium text-center"
      >
        {{ errorMsg }}
      </div>

      <GlassTypeSelector v-model="type" />

      <!-- Submit Button -->
      <GlassMorphButton
        type="submit"
        variant="primary"
        :state="buttonState"
        :disabled="pending"
      >
        <span v-if="isEditMode">💾 Сохранить изменения</span>
        <span v-else
          >💸 Внести {{ type === "expense" ? "трату" : "доход" }}</span
        >

        <template v-if="!isEditMode" #success>
          <RussianRuble :stroke-width="2" />
        </template>
      </GlassMorphButton>
      <!-- Кнопка сканирования (только для новых расходов) -->
      <div v-if="!isEditMode">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileUpload"
        />
        <GlassButton
          type="button"
          label="Сканировать чек"
          variant="soft"
          class="w-full flex items-center gap-2"
          @click.prevent="triggerScan"
        >
          <Camera :stroke-width="2" class="text-text-accent size-9" />
          <span class="text-sm text-text-accent">Загрузить скриншот</span>
        </GlassButton>
      </div>
      <div
        v-if="scanError"
        class="text-text-accent text-sm font-medium text-center -mt-2"
      >
        {{ scanError }}
      </div>
    </form>
  </GlassModal>

  <!-- Модалка загрузки для чека -->
  <GlassModal :is-open="isScanning" position="center" :show-close="false">
    <p class="text-text-primary font-medium text-center animate-pulse">
      Читаю чек... <br />Магия нейросетей работает ✨
    </p>
  </GlassModal>
</template>
