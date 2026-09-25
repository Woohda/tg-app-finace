<script setup lang="ts">
/**
 * @module app/pages/scan
 * @fileoverview Экран ревью транзакций после сканирования чека ИИ
 * @description
 * Отображает распарсенные ИИ транзакции с группировкой по категориям.
 * Позволяет пользователю редактировать, удалять и сохранять операции в базу данных.
 * ---
 * ### Логика работы:
 * 1. Получение результатов распознавания из `useScanResultsStore`.
 * 2. Инициализация и сохранение позиций с локальной датой `formatDateISO()`.
 * 3. Редактирование отдельных транзакций через модальное окно.
 * 4. Пакетное сохранение подтвержденных транзакций в базу данных через `addBulkTransactions`.
 */
import { computed, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Sparkles, RussianRuble, Trash2 } from "@lucide/vue";
import { parseAmount } from "~/utils/format";

definePageMeta({
  layout: "clean",
});

interface ScannedTransaction {
  id?: string;
  type: "expense" | "income";
  amount: number;
  name: string;
  suggestedCategory?: string;
  categoryId?: string;
  date?: string;
}

const router = useRouter();
const scanResults = useState<ScannedTransaction[]>("scanResults", () => []);
const { addBulkTransactions } = useTransactions();

// Категории для маппинга
const { categories, fetchCategories } = useCategories();

// Обогащаем результаты ID категорий на основе suggestedCategory
const editableItems = ref<ScannedTransaction[]>([]);

onMounted(async () => {
  await fetchCategories();

  if (!scanResults.value || scanResults.value.length === 0) {
    router.push("/");
    return;
  }

  const today = formatDateISO();

  // Для каждой транзакции пытаемся найти категорию по имени
  editableItems.value = scanResults.value.map((tx) => {
    // Простой поиск по имени (без учета регистра) и типу
    const matchedCategory = categories.value.find(
      (c) =>
        c.name.toLowerCase() === tx.suggestedCategory?.toLowerCase() &&
        c.type === tx.type,
    );

    // Фолбек на первую категорию подходящего типа
    const defaultCategory = categories.value.find((c) => c.type === tx.type);

    return {
      id: Math.random().toString(36).substring(7), // локальный ID
      type: tx.type || "expense",
      amount: Number(tx.amount),
      name: tx.name,
      categoryId: matchedCategory
        ? matchedCategory.id
        : defaultCategory?.id || "",
      date: tx.date || today,
    };
  });
});

// -- Группировка транзакций по категориям --
const groupedItems = computed(() => {
  const groups: Record<
    string,
    { categoryName: string; icon: string; items: ScannedTransaction[] }
  > = {};

  editableItems.value.forEach((item) => {
    const cat = categories.value.find((c) => c.id === item.categoryId);
    const catName = cat?.name || "Без категории";
    const catIcon = cat?.icon || "❓";
    const key = `${item.type}_${item.categoryId || "unknown"}`;

    if (!groups[key]) {
      groups[key] = { categoryName: catName, icon: catIcon, items: [] };
    }
    groups[key].items.push(item);
  });

  return groups;
});

// -- Удаление транзакции --
const removeItemById = (id: string) => {
  editableItems.value = editableItems.value.filter((i) => i.id !== id);
  if (editableItems.value.length === 0) {
    scanResults.value = [];
    router.push("/");
  }
};

// -- Удаление всей группы --
const removeGroupById = (groupId: string) => {
  editableItems.value = editableItems.value.filter((i) => {
    const key = `${i.type}_${i.categoryId || "unknown"}`;
    return key !== groupId;
  });
  if (editableItems.value.length === 0) {
    scanResults.value = [];
    router.push("/");
  }
};

// -- Модальное окно редактирования --
const isEditModalOpen = ref(false);
const editingItem = ref<ScannedTransaction | null>(null);

const openEditModal = (item: ScannedTransaction) => {
  editingItem.value = JSON.parse(JSON.stringify(item));
  isEditModalOpen.value = true;
};

const closeEditModal = () => {
  isEditModalOpen.value = false;
  editingItem.value = null;
};

const saveEditModal = (item: ScannedTransaction) => {
  const index = editableItems.value.findIndex((i) => i.id === item.id);
  if (index !== -1) {
    editableItems.value[index] = item;
  }
  closeEditModal();
};

// -- Сохранение всех транзакций в БД --
const isSaving = ref(false);
const saveError = ref("");

const saveAll = async () => {
  if (editableItems.value.length === 0 || isSaving.value) return;

  isSaving.value = true;
  saveError.value = "";

  try {
    const transactionsToSave: {
      amount: number;
      name: string;
      category_id: string;
      type: string;
      date: string;
    }[] = [];
    const fallbackDate = formatDateISO();

    editableItems.value.forEach((item) => {
      transactionsToSave.push({
        amount: parseAmount(item.amount),
        name: item.name,
        category_id: item.categoryId || "",
        type: item.type,
        date: item.date || fallbackDate,
      });
    });

    if (transactionsToSave.some((t) => !t.category_id)) {
      saveError.value = "Пожалуйста, выберите категории для всех транзакций";
      isSaving.value = false;
      return;
    }

    if (transactionsToSave.some((t) => isNaN(t.amount) || t.amount <= 0)) {
      saveError.value = "Пожалуйста, проверьте суммы всех транзакций";
      isSaving.value = false;
      return;
    }

    const res = await addBulkTransactions(transactionsToSave);

    if (res.success) {
      scanResults.value = [];
      setTimeout(() => {
        router.push("/");
      }, 700);
    } else {
      saveError.value = res.error || "Ошибка при сохранении";
    }
  } catch {
    saveError.value = "Неизвестная ошибка";
  } finally {
    isSaving.value = false;
  }
};

const cancelAll = () => {
  scanResults.value = [];
  router.push("/");
};
</script>

<template>
  <div class="flex flex-col gap-5 relative">
    <!-- Header -->
    <div class="flex items-center justify-center gap-3 relative">
      <div class="flex flex-col text-center">
        <h1
          class="text-text-primary text-xl font-bold tracking-tight flex items-center gap-2 justify-center"
        >
          <Sparkles class="size-5 text-text-accent" :stroke-width="1.5" />
          Скриншот распознан
        </h1>
        <p class="text-text-secondary text-xs">
          Проверьте позиции перед сохранением
        </p>
      </div>
    </div>

    <div
      v-if="saveError"
      class="text-text-accent text-sm font-medium text-center"
    >
      {{ saveError }}
    </div>

    <!-- Список транзакций по группам -->
    <div class="flex flex-col gap-4">
      <GlassCard
        v-for="(group, catId) in groupedItems"
        :key="catId"
        class="flex flex-col gap-2 pb-4"
      >
        <!-- Заголовок группы -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl leading-none">{{ group.icon }}</span>
            <span class="font-bold text-text-primary text-sm">{{
              group.categoryName
            }}</span>
          </div>
          <Button
            variant="ghost"
            size="xs"
            class="text-text-accent transition-colors"
            @click="removeGroupById(catId)"
          >
            <Trash2 :stroke-width="2" />
          </Button>
        </div>

        <!-- Список элементов -->
        <div class="flex flex-col">
          <TransactionItem
            v-for="item in group.items"
            :key="item.id"
            :title="item.name"
            :amount="item.amount"
            :type="item.type"
            :date="item.date!"
            :show-full-date="true"
            interactive
            class="transition-colors px-2 py-1.5"
            @click="openEditModal(item)"
            @delete="removeItemById(item.id!)"
          />
        </div>
      </GlassCard>
    </div>

    <GlassMorphButton
      variant="primary"
      :state="isSaving ? 'loading' : 'idle'"
      @click="saveAll"
    >
      <span>Внести {{ editableItems.length }} трат(ы)</span>
      <template #success>
        <RussianRuble :stroke-width="2" />
      </template>
    </GlassMorphButton>

    <GlassButton variant="soft" class="w-full font-medium" @click="cancelAll">
      Отменить
    </GlassButton>

    <ScanEditModal
      :is-open="isEditModalOpen"
      :item="editingItem"
      :categories="categories"
      @close="closeEditModal"
      @save="saveEditModal"
    />
  </div>
</template>
