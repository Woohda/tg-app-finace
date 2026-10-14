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
import { Plus, Users, HandCoins, Receipt, Scale } from "@lucide/vue";
import type { SplitSettlement } from "~/types/split";
import type { GroupModalsExpose } from "~/components/split/GroupModals.vue";
import { formatTelegramSplitReport } from "~/utils/splitAlgorithm";
import { formatAmount } from "~/utils/format";

const route = useRoute();
const router = useRouter();
const toast = useAppToast();
const groupId = computed(() => route.params.id as string);

const { currentGroup, fetchGroup, notifyDebtors, pending, error } = useSplit();

const isGroupLoading = computed(() => {
  return pending.value || currentGroup.value?.id !== groupId.value;
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

const handleGroupDeleted = () => {
  router.replace("/split");
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
  if (!groupId.value || isNotifying.value) return;
  const last = currentGroup.value?.last_notified_at;
  if (last && Date.now() - new Date(last).getTime() < 24 * 60 * 60 * 1000) {
    return;
  }
  isNotifying.value = true;
  try {
    await notifyDebtors(groupId.value);
  } finally {
    isNotifying.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Шапка страницы -->
    <PageHeader back-to="/split" back-aria-label="Назад к группам" />

    <!-- Скелетон загрузки -->
    <div
      v-if="isGroupLoading && !error"
      class="flex flex-col gap-4 animate-pulse"
    >
      <!-- Сводная карточка группы -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2.5">
          <Skeleton class="size-22 shrink-0 -mt-1" rounded="full" />
          <div class="flex flex-col gap-2 min-w-0 flex-1 justify-center">
            <Skeleton class="h-6 w-40" rounded="lg" />
            <Skeleton class="h-3 w-20 -mt-px" rounded="md" />
            <div class="flex items-center -space-x-1.5 -mt-px">
              <Skeleton
                v-for="i in 5"
                :key="i"
                class="size-10"
                rounded="full"
              />
            </div>
          </div>
        </div>

        <!-- Две плашки балансов в ряд -->
        <div class="grid grid-cols-2 gap-2.5 mt-1">
          <Skeleton class="h-20 w-full" rounded="3xl" />
          <Skeleton class="h-20 w-full" rounded="3xl" />
        </div>

        <!-- Кнопки действий -->
        <div class="flex items-center gap-1.5 pt-0.5">
          <Skeleton class="h-8 flex-1" rounded="xl" />
          <Skeleton class="h-8 w-20" rounded="xl" />
        </div>
      </div>

      <!-- Переключатель вкладок -->
      <div class="flex justify-center px-5">
        <Skeleton class="h-8 w-full" rounded="2xl" />
      </div>

      <!-- Список элементов -->
      <div class="flex flex-col gap-2">
        <GlassCard
          v-for="i in 3"
          :key="i"
          class="p-3.5 flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <Skeleton class="size-8 shrink-0" rounded="full" />
            <div class="flex flex-col gap-1.5">
              <Skeleton class="h-4 w-28" />
              <Skeleton class="h-3 w-16" />
            </div>
          </div>
          <Skeleton class="h-5 w-20" rounded="lg" />
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
        :is-notifying="isNotifying"
        :is-copied="isCopied"
        :current-auth-avatar-url="currentAuthAvatarUrl"
        @open-members="modalsRef?.openMembers()"
        @add-member="modalsRef?.openAddMember()"
        @notify="handleNotify"
        @copy-report="handleCopyReport"
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
            @settle="modalsRef?.openSettle($event)"
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
            class="h-auto text-xs py-1.5 px-4 gap-1"
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
          class="p-4 flex items-center justify-between"
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
