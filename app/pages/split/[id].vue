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
 * 3. Навигация между вкладками «Отчет», «Расходы» и «Переводы» через `GlassSegmentedControl`.
 * 4. Копирование сводного текстового отчета в буфер обмена и отправка Telegram-уведомлений должникам.
 * 5. Делегирование управления всеми модальными окнами компоненту `GroupModals`.
 * 6. Перенаправление на список групп при удалении группы.
 */
import { ref, computed, onMounted } from "vue";
import {
  Plus,
  Users,
  HandCoins,
  Receipt,
  ArrowRightLeft,
  Check,
  Copy,
} from "@lucide/vue";
import type { SplitSettlement, SplitDebtTransfer } from "~/types/split";
import type { GroupModalsExpose } from "~/components/split/GroupModals.vue";
import { formatTelegramSplitReport } from "~/utils/splitAlgorithm";
import { formatAmount } from "~/utils/format";

const route = useRoute();
const toast = useAppToast();
const groupId = computed(() => route.params.id as string);

const { currentGroup, fetchGroup, notifyDebtors, isLoading, error } =
  useSplit();

const isGroupLoading = computed(() => {
  return isLoading.value || currentGroup.value?.id !== groupId.value;
});

const isNotifying = ref(false);
const isCopied = ref(false);

const activeTab = ref<"report" | "expenses" | "transfers">("report");

const tabOptions = [
  { id: "report" as const, label: "Отчет" },
  { id: "expenses" as const, label: "Расходы" },
  { id: "transfers" as const, label: "Переводы" },
];

const { avatarUrl: currentAuthAvatarUrl } = useAuth();
const modalsRef = ref<GroupModalsExpose | null>(null);

const loadCurrentGroup = async () => {
  if (groupId.value) {
    if (currentGroup.value && currentGroup.value.id !== groupId.value) {
      currentGroup.value = null;
    }
    await fetchGroup(groupId.value);
  }
};

onMounted(() => {
  loadCurrentGroup();
});

const currentMember = computed(() => {
  return currentGroup.value?.members.find((m) => m.is_current_user);
});

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

let isDeletingGroup = false;
const handleGroupDeleted = async () => {
  if (isDeletingGroup) return;
  isDeletingGroup = true;
  currentGroup.value = null;
  await navigateTo("/split", { replace: true });
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

const notifyingTransferKey = ref<string | null>(null);

const handleNotifyTransfer = async (transfer: SplitDebtTransfer) => {
  if (!groupId.value || isNotifying.value) return;

  notifyingTransferKey.value = `${groupId.value}:${transfer.fromMemberId}:${transfer.toMemberId}`;
  isNotifying.value = true;
  try {
    const res = await notifyDebtors(groupId.value, {
      fromMemberId: transfer.fromMemberId,
      toMemberId: transfer.toMemberId,
    });
    if (res && res.notified && typeof window !== "undefined") {
      const key = `fino_split_notify_${groupId.value}_${transfer.fromMemberId}_${transfer.toMemberId}`;
      window.localStorage.setItem(key, String(Date.now()));
    }
  } finally {
    isNotifying.value = false;
    notifyingTransferKey.value = null;
  }
};
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Шапка страницы -->
    <PageHeader back-to="/split" back-aria-label="Назад к группам">
      <GroupHeader
        v-if="currentGroup && !isGroupLoading"
        :group="currentGroup"
        :current-auth-avatar-url="currentAuthAvatarUrl"
        @open-members="modalsRef?.openMembers()"
        @add-member="modalsRef?.openAddMember()"
      />
      <!-- Скелетон шапки: название и количество участников -->
      <div
        v-else-if="isGroupLoading"
        class="flex flex-col items-center gap-1.5"
      >
        <Skeleton class="h-6.5 w-50" rounded="xl" />
        <Skeleton class="h-3.5 w-25" rounded="md" />
      </div>
    </PageHeader>

    <!-- Скелетон загрузки -->
    <div
      v-if="isGroupLoading && !error"
      class="flex flex-col gap-4 animate-pulse"
    >
      <!-- Сводная карточка группы (аватары, плашки баланса, кнопки) -->
      <div class="flex flex-col gap-5">
        <!-- Стек аватаров и кнопка добавления -->
        <div class="flex items-center justify-center ml-1">
          <div class="flex items-center -space-x-3 rounded-full">
            <Skeleton v-for="i in 6" :key="i" class="size-9.5" rounded="full" />
          </div>
          <Skeleton class="h-8.5 w-30 ml-1" rounded="full" />
        </div>

        <!-- Две плашки балансов в ряд -->
        <div class="grid grid-cols-2 gap-2.5 mt-1">
          <GlassCard class="flex-1 p-4 flex flex-col justify-center gap-1.5">
            <Skeleton class="h-3 w-30" rounded="md" />
            <Skeleton class="h-6 w-24 mt-0.5" rounded="lg" />
          </GlassCard>
          <GlassCard class="flex-1 p-4 flex flex-col justify-center gap-1.5">
            <Skeleton class="h-3 w-20" rounded="md" />
            <Skeleton class="h-6 w-20 mt-0.5" rounded="lg" />
          </GlassCard>
        </div>

        <!-- Кнопки вкладок -->
        <div class="flex items-center gap-2.5">
          <Skeleton class="h-7 flex-1" rounded="full" />
        </div>
      </div>

      <!-- Секция отчета: оптимизированные переводы -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <Skeleton class="h-3.5 w-20" rounded="md" />
          <Skeleton class="h-5 w-35" rounded="xl" />
        </div>

        <GlassCard v-for="i in 2" :key="i" class="flex flex-col px-3.5 py-2.5">
          <div class="flex items-center justify-between gap-2.5">
            <Skeleton class="size-10 shrink-0" rounded="full" />
            <div class="flex flex-col gap-1.5 flex-1 min-w-0">
              <Skeleton class="h-4 w-32" rounded="md" />
              <Skeleton class="h-3 w-20" rounded="sm" />
            </div>
            <Skeleton class="h-6 w-16" rounded="lg" />
          </div>
        </GlassCard>
      </div>

      <!-- Секция отчета: балансы участников -->
      <div class="flex flex-col gap-2 pt-2">
        <Skeleton class="h-3.5 w-40 ml-1" rounded="md" />

        <GlassCard class="p-4 pb-2 flex flex-col gap-3">
          <div
            v-for="i in 3"
            :key="i"
            class="flex items-center justify-between gap-3 pb-2 border-b border-black/5 last:border-none"
          >
            <div class="flex flex-col gap-1.5 flex-1">
              <Skeleton class="h-4 w-24" rounded="md" />
              <Skeleton class="h-2.5 w-36" rounded="sm" />
            </div>
            <Skeleton class="h-5 w-16" rounded="md" />
          </div>
        </GlassCard>
      </div>
    </div>

    <!-- Ошибка загрузки -->
    <GlassErrorState
      v-else-if="error && (!currentGroup || currentGroup.id !== groupId)"
      title="Не удалось загрузить группу"
      :error="error"
      @retry="loadCurrentGroup"
    />

    <div
      v-else-if="currentGroup && currentGroup.id === groupId"
      class="flex flex-col gap-4"
    >
      <!-- Сводная карточка группы -->
      <GroupSummaryCard
        :group="currentGroup"
        :current-auth-avatar-url="currentAuthAvatarUrl"
        @open-members="modalsRef?.openMembers()"
        @add-member="modalsRef?.openAddMember()"
      />

      <!-- Переключатель вкладок -->
      <GlassSegmentedControl
        v-model="activeTab"
        :options="tabOptions"
        size="sm"
        class="px-5"
      />

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
            @click="modalsRef?.openAddExpense()"
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
              <ArrowRightLeft class="size-4 text-text-accent" />
              Переводы
            </span>
            <GlassButton
              variant="soft"
              class="h-auto min-w-0 py-1 px-3 flex items-center justify-center gap-1.25 text-xs"
              @click="handleCopyReport"
            >
              <component
                :is="isCopied ? Check : Copy"
                class="size-3.5 shrink-0"
                :class="isCopied ? 'text-accent-success' : 'text-text-accent'"
                :stroke-width="1.5"
              />
              <span>{{ isCopied ? "Скопировано!" : "Скопировать отчет" }}</span>
            </GlassButton>
          </div>

          <DebtsOptimizedList
            :transfers="currentGroup.optimizedDebts"
            :current-member-id="currentMember?.id"
            :group-id="currentGroup.id"
            :is-notifying="isNotifying"
            :notifying-transfer-key="notifyingTransferKey"
            @settle="modalsRef?.openSettle($event)"
            @notify="handleNotifyTransfer($event)"
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
            class="h-auto text-sm py-1 px-4 gap-1"
            @click="modalsRef?.openAddExpense()"
          >
            <Plus class="size-3.5 text-text-accent" :stroke-width="1.5" />
            Платеж
          </GlassButton>
        </div>

        <ExpensesList
          :group-id="currentGroup.id"
          :expenses="currentGroup.expenses"
          :current-member-id="currentMember?.id"
          @delete="modalsRef?.promptDeleteExpense($event)"
          @edit="modalsRef?.openEditExpense($event)"
          @export-share="modalsRef?.openExportShare($event)"
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
            class="h-auto text-sm py-1 px-4 gap-1"
            @click="modalsRef?.openSettle()"
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
          class="py-4 px-5 flex items-center justify-between"
        >
          <div class="flex flex-col">
            <span class="text-sm font-bold text-text-primary">
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

    <!-- Модальные окна группы -->
    <GroupModals
      v-if="currentGroup"
      ref="modalsRef"
      :group="currentGroup"
      :current-auth-avatar-url="currentAuthAvatarUrl"
      @refresh="fetchGroup(groupId)"
      @group-deleted="handleGroupDeleted"
    />
  </div>
</template>
