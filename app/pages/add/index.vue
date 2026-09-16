<script setup lang="ts">
/**
 * @module app/pages/add
 * @fileoverview Экран добавления / редактирования транзакции
 * @description
 * Если query-параметр `?edit=<id>` присутствует — работает в режиме редактирования.
 * Иначе — создание новой транзакции.
 */
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Calendar, RussianRuble, Camera } from "@lucide/vue";
import { transactionFrontendSchema } from "~/types/validate";
import { formatZodError } from "~/utils/zod";

const router = useRouter();
const route = useRoute();
const { addTransaction, updateTransaction, transactions } = useTransactions();
const { token } = useAuth();

// Edit mode
const editId = computed(() => (route.query.edit as string) || null);
const isEditMode = computed(() => !!editId.value);

const type = ref<"expense" | "income">("expense");
const amount = ref<number | "">("");
const categoryId = ref<string>("");
const description = ref<string>("");
const date = ref<string>(new Date().toISOString().split("T")[0] as string); // YYYY-MM-DD

// Категории из готового composable (auth уже внутри)
const { categories, isLoading: pending, fetchCategories } = useCategories();

const amountInputRef = ref<{ focus: () => void } | null>(null);

onMounted(() => {
  fetchCategories();
  setTimeout(() => {
    amountInputRef.value?.focus();
  }, 100);
});

// Filter categories by selected type
const filteredCategories = computed(() => {
  return categories.value.filter((c) => c.type === type.value);
});

const buttonState = ref<"idle" | "loading" | "success">("idle");
const errorMsg = ref("");

// Заполняем форму данными транзакции в edit-режиме
watch(
  [editId, transactions],
  () => {
    if (!editId.value) return;
    const tx = transactions.value.find((t) => t.id === editId.value);
    if (!tx) return;
    type.value = tx.type;
    amount.value = tx.amount;
    categoryId.value = tx.categoryId;
    description.value = tx.description || "";
    date.value = tx.date;
  },
  { immediate: true },
);

const submit = async () => {
  const result = transactionFrontendSchema.safeParse({
    amount: Number(amount.value),
    categoryId: categoryId.value,
    date: date.value,
    type: type.value,
    description: description.value,
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
    description: result.data.description || undefined,
  };

  if (isEditMode.value && editId.value) {
    res = await updateTransaction(editId.value, txData);
  } else {
    res = await addTransaction(txData);
  }

  if (res.success) {
    buttonState.value = "success";
    setTimeout(() => {
      router.push(isEditMode.value ? "/finreports" : "/");
    }, 1200); // Ждем завершения красивой анимации успеха перед переходом
  } else {
    buttonState.value = "idle";
    errorMsg.value = res.error || "Ошибка при сохранении";
  }
};

watch(type, () => {
  if (!isEditMode.value) {
    categoryId.value = "";
  }
});

// -- Логика сканирования чека --

interface ScannedTransaction {
  type: "expense" | "income";
  amount: number;
  description: string;
  suggestedCategory?: string;
}

const fileInput = ref<HTMLInputElement | null>(null);
const isScanning = ref(false);
const scanError = ref("");
const scanResults = useState<ScannedTransaction[]>("scanResults", () => []);

const triggerScan = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  isScanning.value = true;
  scanError.value = "";

  try {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
    reader.readAsDataURL(file);
    const base64Data = await base64Promise;

    const res = await $fetch("/api/ai/parse-receipt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: { image: base64Data },
    });

    if (res && res.transactions) {
      scanResults.value = res.transactions;
      router.push("/scan-results");
    } else {
      throw new Error("Неверный формат ответа");
    }
  } catch (e) {
    scanError.value = parseApiError(e, "Ошибка распознавания чека");
  } finally {
    isScanning.value = false;
    if (fileInput.value) fileInput.value.value = ""; // reset
  }
};
</script>

<template>
  <div class="relative w-full h-full">
    <GlassCard class="flex flex-col gap-5">
      <div class="flex items-center justify-center gap-3">
        <div class="flex flex-col text-center w-full relative">
          <h1 class="text-text-primary text-xl font-bold tracking-tight">
            {{ isEditMode ? "Редактирование" : "Новая операция" }}
          </h1>
          <p class="text-text-secondary text-xs">
            {{
              isEditMode
                ? "Изменение данных транзакции"
                : "Запись трат или доходов"
            }}
          </p>
        </div>
      </div>

      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <!-- Amount -->
        <GlassInput
          ref="amountInputRef"
          v-model="amount"
          type="number"
          step="0.01"
          label="Сумма"
          placeholder="0.00"
          :icon="RussianRuble"
        />

        <!-- Category -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-bold text-text-primary pl-2"
            >Категория</label
          >
          <GlassCategorySelect
            v-model="categoryId"
            :categories="filteredCategories"
          />
        </div>

        <!-- Date -->
        <GlassInput v-model="date" type="date" label="Дата" :icon="Calendar" />

        <!-- Description -->
        <GlassInput
          v-model="description"
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
          class="max-w-60 py-4 rounded-full"
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
      </form>
      <!-- Кнопка сканирования (только для новых расходов) -->
      <div v-if="!isEditMode" class="absolute bottom-5 right-7">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          @change="handleFileUpload"
        />
        <button
          class="flex items-center justify-center w-12 h-12 p-2 border-transparent rounded-2xl outline-none border-none transition-all duration-300 ease-in-out focus-visible:ring-1 focus-visible:ring-text-accent"
          @click.prevent="triggerScan"
        >
          <Camera :stroke-width="2" class="text-text-accent size-8" />
        </button>
      </div>
      <div
        v-if="scanError"
        class="text-text-accent text-sm font-medium text-center -mt-2"
      >
        {{ scanError }}
      </div>
    </GlassCard>

    <!-- Модалка загрузки -->
    <GlassModal :is-open="isScanning" position="center" :show-close="false">
      <p class="text-text-primary font-medium text-center animate-pulse">
        Читаю чек... <br />Магия нейросетей работает ✨
      </p>
    </GlassModal>
  </div>
</template>
