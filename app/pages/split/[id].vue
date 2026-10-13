<script setup lang="ts">
/**
 * @module app/pages/split/[id]
 * @fileoverview Детальная страница группы совместных трат
 * @description
 * Предоставляет полный интерфейс управления группой:
 * - Сводная карточка: общие расходы, персональное сальдо, интерактивные чипсы участников, копирование отчёта и рассылка напоминаний в Telegram;
 * - Вкладка «Отчет»: оптимизированный расчет переводов и балансы участников;
 * - Вкладка «Расходы»: список трат, добавление новых и экспорт долей в FINO;
 * - Вкладка «Переводы»: история зафиксированных возвратов долгов.
 * ---
 * ### Логика работы:
 * 1. Получение ID группы из параметров маршрута и загрузка данных через `fetchGroup`.
 * 2. Отрисовка сводной карточки общих расходов и персонального баланса.
 * 3. Управление участниками через `GroupMembersChips`: добавление через `AddMemberModal` и подтверждение удаления через `DeleteMemberModal`.
 * 4. Копирование сводного текстового отчета в буфер обмена и отправка Telegram-уведомлений должникам.
 * 5. Навигация между вкладками «Отчет», «Расходы» и «Переводы» через `GlassSegmentedControl`.
 * 6. Управление модальными окнами: создание расходов, добавление участников, фиксация переводов и экспорт долей.
 * 7. Удаление группы владельцем с перенаправлением на список групп.
 */
import { ref, computed, onMounted } from "vue";
import {
  Plus,
  Trash2,
  UserPlus,
  Users,
  HandCoins,
  Receipt,
  Scale,
  Check,
  Copy,
  Bell,
} from "@lucide/vue";
import type {
  SplitDebtTransfer,
  SplitExpense,
  SplitSettlement,
  SplitMember,
} from "~/types/split";
import { formatTelegramSplitReport } from "~/utils/splitAlgorithm";

const route = useRoute();
const router = useRouter();
const toast = useAppToast();
const groupId = computed(() => route.params.id as string);

const {
  currentGroup,
  fetchGroup,
  deleteGroup,
  deleteExpense,
  notifyDebtors,
  isLoading,
} = useSplit();

const isCopied = ref(false);

const activeTab = ref<"report" | "expenses" | "transfers">("report");

const tabOptions = [
  { id: "report" as const, label: "Отчет" },
  { id: "expenses" as const, label: "Расходы" },
  { id: "transfers" as const, label: "Переводы" },
];

// Модальные окна
const isAddExpenseOpen = ref(false);
const isAddMemberOpen = ref(false);
const isSettleModalOpen = ref(false);
const isExportModalOpen = ref(false);
const isDeleteMemberOpen = ref(false);
const memberToDelete = ref<SplitMember | null>(null);

const promptDeleteMember = (member: unknown) => {
  memberToDelete.value = member as SplitMember;
  isDeleteMemberOpen.value = true;
};

const selectedTransferForSettle = ref<SplitDebtTransfer | null>(null);
const selectedExpenseForExport = ref<SplitExpense | null>(null);
const selectedShareAmountForExport = ref(0);
const selectedExpenseForEdit = ref<SplitExpense | null>(null);

const openAddExpenseModal = () => {
  selectedExpenseForEdit.value = null;
  isAddExpenseOpen.value = true;
};

const openEditExpenseModal = (expense: SplitExpense) => {
  selectedExpenseForEdit.value = expense;
  isAddExpenseOpen.value = true;
};

onMounted(() => {
  if (groupId.value) {
    fetchGroup(groupId.value);
  }
});

const currentMember = computed(() => {
  return currentGroup.value?.members.find((m) => m.is_current_user);
});

const openSettleModal = (transfer?: SplitDebtTransfer) => {
  selectedTransferForSettle.value = transfer || null;
  isSettleModalOpen.value = true;
};

const formatSettlementParticipants = (s: SplitSettlement): string => {
  const isFromMe =
    (currentMember.value && s.from_member_id === currentMember.value.id) ||
    s.fromMemberName?.trim().toLowerCase() === "я";
  const isToMe =
    (currentMember.value && s.to_member_id === currentMember.value.id) ||
    s.toMemberName?.trim().toLowerCase() === "я";

  const fromName = isFromMe ? "Я" : s.fromMemberName || "Участник";
  const toName = isToMe ? "Мне" : s.toMemberName || "Участник";

  return `${fromName} ➔ ${toName}`;
};

const openExportModal = (payload: {
  expense: SplitExpense;
  shareAmount: number;
}) => {
  selectedExpenseForExport.value = payload.expense;
  selectedShareAmountForExport.value = payload.shareAmount;
  isExportModalOpen.value = true;
};

const handleDeleteExpense = async (expenseId: string) => {
  if (confirm("Удалить этот расход?")) {
    await deleteExpense(groupId.value, expenseId);
  }
};

const handleDeleteGroup = async () => {
  if (confirm("Вы уверены, что хотите удалить всю группу и все её расходы?")) {
    const success = await deleteGroup(groupId.value);
    if (success) {
      router.replace("/split");
    }
  }
};

const handleCopyReport = async () => {
  if (!currentGroup.value) return;

  const text = formatTelegramSplitReport(
    currentGroup.value.name,
    currentGroup.value.optimizedDebts,
    currentGroup.value.totalGroupSpending,
  );

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    isCopied.value = true;
    toast.success("Скопировано", "Текст отчета готов для отправки в Telegram");
    setTimeout(() => {
      isCopied.value = false;
    }, 2500);
  } catch (err) {
    console.error("Ошибка копирования:", err);
    toast.error("Не удалось скопировать текст");
  }
};

const handleNotify = async () => {
  if (!groupId.value) return;
  await notifyDebtors(groupId.value);
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Шапка группы -->
    <PageHeader
      :title="currentGroup?.name || 'Загрузка...'"
      :subtitle="`${currentGroup?.members.length || 0} участников`"
      back-to="/split"
      back-aria-label="Назад к группам"
    >
      <template #action>
        <GlassButton
          variant="soft"
          size="icon"
          aria-label="Удалить группу"
          @click="handleDeleteGroup"
        >
          <Trash2 class="text-text-accent" :stroke-width="1.5" />
        </GlassButton>
      </template>
    </PageHeader>

    <!-- Загрузка -->
    <div v-if="isLoading && !currentGroup" class="flex justify-center py-10">
      <Loader class="text-text-accent" />
    </div>

    <div v-else-if="currentGroup" class="flex flex-col gap-4">
      <!-- Сводная карточка группы -->
      <GlassCard class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <div class="flex flex-col">
            <span class="text-text-secondary text-xs">Всего потратили:</span>
            <span class="text-2xl font-bold text-text-primary">
              {{ formatAmount(currentGroup.totalGroupSpending) }}
            </span>
          </div>

          <div class="flex flex-col items-end">
            <span class="text-text-secondary text-xs">Ваш баланс:</span>
            <span
              v-if="currentGroup.userNetBalance > 0.01"
              class="text-base font-extrabold text-emerald-500"
            >
              +{{ formatAmount(currentGroup.userNetBalance) }}
            </span>
            <span
              v-else-if="currentGroup.userNetBalance < -0.01"
              class="text-base font-extrabold text-rose-500"
            >
              -{{ formatAmount(Math.abs(currentGroup.userNetBalance)) }}
            </span>
            <span v-else class="text-base font-bold text-text-secondary">
              0 ₽ (в расчете)
            </span>
          </div>
        </div>

        <!-- Горизонтальный список участников с кнопкой добавления -->
        <GroupMembersChips
          :members="currentGroup.members"
          removable
          @remove="promptDeleteMember"
        >
          <template #append>
            <GlassButton
              type="button"
              variant="soft"
              class="h-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs shrink-0"
              @click="isAddMemberOpen = true"
            >
              <UserPlus class="size-3.5 text-text-accent" />
              Добавить
            </GlassButton>
          </template>
        </GroupMembersChips>
        <div class="flex items-center gap-1.5 pt-1 w-full">
          <GlassButton
            variant="soft"
            class="h-auto flex-1 min-w-0 py-1.25 flex items-center justify-center gap-1 text-[11px]"
            :disabled="isLoading"
            @click="handleNotify"
          >
            <Bell
              class="size-3.5 text-text-accent shrink-0"
              :stroke-width="1.5"
            />
            <span class="truncate">{{
              isLoading ? "Сообщаю..." : "Напомнить о переводах"
            }}</span>
          </GlassButton>
          <GlassButton
            variant="soft"
            class="h-auto py-1.25 flex items-center justify-center gap-1 text-[11px] whitespace-nowrap"
            @click="handleCopyReport"
          >
            <component
              :is="isCopied ? Check : Copy"
              class="size-3.5 shrink-0"
              :stroke-width="1.5"
              :class="isCopied ? 'text-accent-success' : 'text-text-secondary'"
            />
            <span class="whitespace-nowrap">{{
              isCopied ? "Скопировано!" : "Отчет"
            }}</span>
          </GlassButton>
        </div>
      </GlassCard>

      <!-- Переключатель вкладок -->
      <GlassSegmentedControl v-model="activeTab" :options="tabOptions" />

      <!-- ЗАГЛУШКА: Нет расходов -->
      <div
        v-if="currentGroup.totalGroupSpending === 0"
        class="flex flex-col items-center justify-center"
      >
        <div class="flex flex-col items-center gap-3">
          <!-- Иконка отсутствия расходов -->
          <Receipt class="size-8 text-text-secondary/50" :stroke-width="1.5" />

          <!-- Текст -->
          <div class="flex flex-col items-center gap-1">
            <p class="text-sm font-bold text-text-primary">Пока нет расходов</p>
            <p class="text-xs text-text-secondary">
              Как только появятся — здесь будет список.
            </p>
          </div>

          <!-- Кнопка добавления расхода -->
          <GlassButton
            type="button"
            variant="soft"
            class="h-auto inline-flex items-center gap-1 py-1.5 text-sm mt-1"
            @click="openAddExpenseModal"
          >
            <Plus class="size-4" :stroke-width="2" />
            <span>Добавить первый расход</span>
          </GlassButton>
        </div>
      </div>

      <!-- ВКЛАДКА 1: Отчет (долги и балансы участников) -->
      <div v-else-if="activeTab === 'report'" class="flex flex-col gap-4">
        <!-- Блок оптимизированных переводов -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between px-1">
            <span
              class="text-xs font-bold text-text-primary flex items-center gap-1.5 tracking-wide"
            >
              <Scale class="size-4 text-text-accent" />
              Оптимизированные переводы
            </span>
            <span class="text-[11px] text-text-secondary">
              {{ currentGroup.optimizedDebts.length }} операций
            </span>
          </div>

          <DebtsOptimizedList
            :transfers="currentGroup.optimizedDebts"
            :current-member-id="currentMember?.id"
            @settle="openSettleModal"
          />
        </div>

        <!-- Блок балансов участников -->
        <div class="flex flex-col gap-2 pt-2">
          <span
            class="text-xs font-bold text-text-primary px-1 flex items-center gap-1.5 tracking-wide"
          >
            <Users class="size-4 text-text-accent" />
            Баланс каждого участника
          </span>
          <BalancesList :balances="currentGroup.balances" />
        </div>
      </div>

      <!-- ВКЛАДКА 2: Расходы -->
      <div v-else-if="activeTab === 'expenses'" class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <span
            class="text-xs font-bold text-text-primary flex items-center gap-1.5 tracking-wide"
          >
            <Receipt class="size-4 text-text-accent" />
            Все расходы ({{ currentGroup.expenses.length }})
          </span>

          <GlassButton
            variant="soft"
            class="h-auto text-xs py-1.5 px-4 gap-1"
            @click="openAddExpenseModal"
          >
            <Plus class="size-3.5 text-text-accent" :stroke-width="1.5" />
            Трата
          </GlassButton>
        </div>

        <ExpensesList
          :group-id="currentGroup.id"
          :expenses="currentGroup.expenses"
          :current-member-id="currentMember?.id"
          @delete="handleDeleteExpense"
          @edit="openEditExpenseModal"
          @export-share="openExportModal"
        />
      </div>

      <!-- ВКЛАДКА 3: Переводы (история расчетов) -->
      <div v-else-if="activeTab === 'transfers'" class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <span
            class="text-xs font-bold text-text-primary flex items-center gap-1.5 tracking-wide"
          >
            <HandCoins class="size-4 text-text-accent" />
            Зафиксированные переводы ({{ currentGroup.settlements.length }})
          </span>

          <GlassButton
            variant="soft"
            class="h-auto text-xs py-1.5 px-4 gap-1"
            @click="openSettleModal()"
          >
            <Plus class="size-3.5 text-text-accent" :stroke-width="1.5" />
            Перевод
          </GlassButton>
        </div>

        <div
          v-if="currentGroup.settlements.length === 0"
          class="p-8 text-center text-text-secondary text-xs glass-card rounded-3xl"
        >
          Переводов пока не зафиксировано. Когда участник вернет долг, нажмите
          «+ Перевод»!
        </div>

        <GlassCard
          v-for="s in currentGroup.settlements"
          :key="s.id"
          class="p-3.5 flex items-center justify-between"
        >
          <div class="flex flex-col">
            <span class="text-xs font-bold text-text-primary">
              {{ formatSettlementParticipants(s) }}
            </span>
            <span class="text-[11px] text-text-secondary">
              {{ formatDate(s.date) }}
            </span>
          </div>

          <span class="text-sm text-accent-success font-bold">
            {{ formatAmount(s.amount) }}
          </span>
        </GlassCard>
      </div>
    </div>

    <!-- Модальные окна -->
    <AddExpenseModal
      v-if="currentGroup"
      :is-open="isAddExpenseOpen"
      :group-id="currentGroup.id"
      :members="currentGroup.members"
      :expense-to-edit="selectedExpenseForEdit"
      @close="
        isAddExpenseOpen = false;
        selectedExpenseForEdit = null;
      "
      @saved="
        isAddExpenseOpen = false;
        selectedExpenseForEdit = null;
        fetchGroup(groupId);
      "
    />

    <AddMemberModal
      v-if="currentGroup"
      :is-open="isAddMemberOpen"
      :group-id="currentGroup.id"
      @close="isAddMemberOpen = false"
      @added="fetchGroup(groupId)"
    />

    <SettleDebtModal
      v-if="currentGroup"
      :is-open="isSettleModalOpen"
      :group-id="currentGroup.id"
      :members="currentGroup.members"
      :default-transfer="selectedTransferForSettle"
      @close="isSettleModalOpen = false"
      @saved="fetchGroup(groupId)"
    />

    <ExportShareModal
      v-if="currentGroup"
      :is-open="isExportModalOpen"
      :group-id="currentGroup.id"
      :expense="selectedExpenseForExport"
      :user-share-amount="selectedShareAmountForExport"
      @close="isExportModalOpen = false"
      @exported="fetchGroup(groupId)"
    />

    <DeleteMemberModal
      :is-open="isDeleteMemberOpen"
      :group-id="groupId"
      :member="memberToDelete"
      @close="
        isDeleteMemberOpen = false;
        memberToDelete = null;
      "
      @deleted="fetchGroup(groupId)"
    />
  </div>
</template>
