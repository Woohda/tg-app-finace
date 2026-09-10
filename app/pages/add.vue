<script setup lang="ts">
/**
 * @module app/pages/add
 * @fileoverview Экран добавления / редактирования транзакции
 * @description
 * Если query-параметр `?edit=<id>` присутствует — работает в режиме редактирования.
 * Иначе — создание новой транзакции.
 */
import { ref, computed, watch } from "vue";
import GlassButton from "~/components/GlassButton.vue";
import GlassSegmentedControl from "~/components/GlassSegmentedControl.vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const { addTransaction, updateTransaction, transactions } = useTransactions();

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
onMounted(fetchCategories);

// Filter categories by selected type
const filteredCategories = computed(() => {
  return categories.value.filter((c) => c.type === type.value);
});

const isSubmitting = ref(false);
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
  if (!amount.value || amount.value <= 0) {
    errorMsg.value = "Введите корректную сумму";
    return;
  }
  if (!categoryId.value) {
    errorMsg.value = "Выберите категорию";
    return;
  }
  if (!date.value) {
    errorMsg.value = "Выберите дату";
    return;
  }

  errorMsg.value = "";
  isSubmitting.value = true;

  let res: { success: boolean; error?: string };

  if (isEditMode.value && editId.value) {
    res = await updateTransaction(editId.value, {
      amount: Number(amount.value),
      category_id: categoryId.value,
      type: type.value,
      date: date.value,
      description: description.value || undefined,
    });
  } else {
    res = await addTransaction({
      amount: Number(amount.value),
      category_id: categoryId.value,
      type: type.value,
      date: date.value,
      description: description.value || undefined,
    });
  }

  isSubmitting.value = false;

  if (res.success) {
    router.push(isEditMode.value ? "/finreports" : "/");
  } else {
    errorMsg.value = res.error || "Ошибка при сохранении";
  }
};

// Reset category when type changes (only in create mode)
watch(type, () => {
  if (!isEditMode.value) {
    categoryId.value = "";
  }
});
</script>

<template>
  <div class="pt-12 px-6 pb-24 flex flex-col gap-6 min-h-screen">
    <div class="flex flex-col items-center">
      <h1 class="text-text-primary text-2xl font-bold tracking-tight">
        {{ isEditMode ? 'Редактирование' : 'Новая операция' }}
      </h1>
      <p class="text-text-secondary text-sm">
        {{ isEditMode ? 'Изменение данных транзакции' : 'Запись расхода или дохода' }}
      </p>
    </div>

    <GlassSegmentedControl
      v-model="type"
      :options="[
        { id: 'expense', label: 'Расход' },
        { id: 'income', label: 'Доход' },
      ]"
    />

    <form class="flex flex-col gap-5 mt-2" @submit.prevent="submit">
      
      <!-- Amount -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-bold text-text-primary pl-2">Сумма (₽)</label>
        <input
          v-model="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          class="w-full glass-milky rounded-2xl px-5 py-4 text-text-primary font-medium text-lg outline-none placeholder-text-secondary/50 shadow-glass-inner transition-all focus:ring-2 focus:ring-accent-end/30 appearance-none"
        >
      </div>

      <!-- Category -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-bold text-text-primary pl-2">Категория</label>
        <div class="relative">
          <select
            v-model="categoryId"
            class="w-full glass-milky rounded-2xl px-5 py-4 text-text-primary font-medium text-base outline-none shadow-glass-inner transition-all focus:ring-2 focus:ring-accent-end/30 appearance-none disabled:opacity-50"
            :disabled="pending"
          >
            <option value="" disabled>Выберите категорию...</option>
            <option v-for="cat in filteredCategories" :key="cat.id" :value="cat.id">
              {{ cat.icon }} {{ cat.name }}
            </option>
          </select>
          <!-- Custom arrow -->
          <div class="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
            ▼
          </div>
        </div>
      </div>

      <!-- Date -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-bold text-text-primary pl-2">Дата</label>
        <input
          v-model="date"
          type="date"
          class="w-full glass-milky rounded-2xl px-5 py-4 text-text-primary font-medium text-base outline-none shadow-glass-inner transition-all focus:ring-2 focus:ring-accent-end/30 appearance-none"
        >
      </div>

      <!-- Description -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-bold text-text-primary pl-2">Комментарий</label>
        <input
          v-model="description"
          type="text"
          placeholder="Например, Обед с коллегами"
          class="w-full glass-milky rounded-2xl px-5 py-4 text-text-primary font-medium text-base outline-none placeholder-text-secondary/50 shadow-glass-inner transition-all focus:ring-2 focus:ring-accent-end/30 appearance-none"
        >
      </div>

      <div v-if="errorMsg" class="text-accent-end text-sm font-medium text-center">
        {{ errorMsg }}
      </div>

      <!-- Submit Button -->
      <GlassButton type="submit" class="mt-4 py-4 rounded-full" :disabled="isSubmitting || pending">
        <span v-if="isSubmitting">Сохранение...</span>
        <span v-else-if="isEditMode">Сохранить изменения</span>
        <span v-else>Добавить {{ type === 'expense' ? 'расход' : 'доход' }}</span>
      </GlassButton>

    </form>
  </div>
</template>
