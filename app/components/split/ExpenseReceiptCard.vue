<script setup lang="ts">
/**
 * @module app/components/split/ExpenseReceiptCard
 * @fileoverview Карточка совместного расхода в стиле детализированного кассового чека (Receipt Ticket)
 * @description
 * Отображает расход в виде аутентичного бумажного чека с перфорированными волновыми краями (scalloped edges),
 * штрихкодом, статусом «Оплачено», детальной раскладкой долей участников с пунктирными отступами (dot leaders),
 * вырезами билета (ticket notches) и интерактивным раскрытием/сворачиванием середины.
 * Стилизован строго по дизайн-системе приложения: glass-milky, glass-pill, парящее матовое стекло.
 * ---
 * ### Логика работы:
 * 1. Форматирование номера чека (проп `number` преобразуется в 4-значный вид `№0001`) и даты операции.
 * 2. В свернутом состоянии отображаются штрихкод, статус, название, сумма, плательщик и кнопки быстрых действий.
 * 3. При клике на чек или кнопку «Раскрыть» плавно раздвигается детализация с группировкой одинаковых долей и блоком «Ваша доля».
 * 4. Тактильный отклик (Telegram Haptics) при переключении раскрытия и действиях с чеком.
 */
import { ref, computed } from "vue";
import {
  NotebookPen,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "@lucide/vue";
import type { SplitExpense } from "~/types/split";
import { formatAmount, getAmountTextSize } from "~/utils/format";
import { roundCurrency } from "~/utils/splitAlgorithm";
import { getHapticFeedback } from "~/utils/haptics";

const props = withDefaults(
  defineProps<{
    expense: SplitExpense;
    currentMemberId?: string;
    defaultExpanded?: boolean;
    number?: number;
  }>(),
  {
    currentMemberId: undefined,
    defaultExpanded: false,
    number: 1,
  },
);

const formattedReceiptNumber = computed(() => {
  return String(props.number ?? 1).padStart(4, "0");
});

const emit = defineEmits<{
  (e: "delete", expenseId: string): void;
  (e: "edit", expense: SplitExpense): void;
  (
    e: "exportShare",
    payload: { expense: SplitExpense; shareAmount: number },
  ): void;
}>();

const haptic = getHapticFeedback();
const isExpanded = ref(props.defaultExpanded);

const toggleExpand = () => {
  haptic.selection();
  isExpanded.value = !isExpanded.value;
};

// Расчет доли текущего пользователя
const myShare = computed<number>(() => {
  if (!props.currentMemberId) return 0;
  const share = props.expense.shares.find(
    (s) => s.member_id === props.currentMemberId,
  );
  return share ? Number(share.amount) : 0;
});

const displayDate = computed<string>(() => {
  return formatDisplayDate(props.expense.date, true);
});

// Имя плательщика (если текущий пользователь — выводим «Я»)
const payerDisplayName = computed<string>(() => {
  const rawName = props.expense.payerName?.trim() || "Участник";
  const isMe =
    Boolean(
      props.currentMemberId && props.expense.payer_id === props.currentMemberId,
    ) || rawName.toLowerCase() === "я";
  return isMe ? "Я" : rawName;
});

interface GroupedMember {
  id: string;
  name: string;
  displayName: string;
  is_current_user: boolean;
}

interface GroupedShare {
  amount: number;
  members: GroupedMember[];
}

const amountsTextSize = computed(() => {
  return getAmountTextSize([props.expense.amount]);
});

// Группировка долей участников по одинаковым суммам с красивым отображением
const groupedShares = computed<GroupedShare[]>(() => {
  const map = new Map<number, GroupedMember[]>();

  for (const s of props.expense.shares) {
    const amt = roundCurrency(Number(s.amount));
    const list = map.get(amt) || [];
    const isMe = s.member_id === props.currentMemberId;

    let displayName = s.memberName || "Участник";
    if (isMe) {
      displayName =
        displayName.trim().toLowerCase() === "я"
          ? "Я (Вы)"
          : `${displayName} (Вы)`;
    }

    list.push({
      id: s.member_id,
      name: s.memberName || "Участник",
      displayName,
      is_current_user: isMe,
    });
    map.set(amt, list);
  }

  return Array.from(map.entries())
    .map(([amount, members]) => ({ amount, members }))
    .sort((a, b) => b.amount - a.amount);
});

const handleExport = () => {
  haptic.impact("light");
  emit("exportShare", {
    expense: props.expense,
    shareAmount: myShare.value,
  });
};

const handleEdit = () => {
  haptic.selection();
  emit("edit", props.expense);
};

const handleDelete = () => {
  haptic.notification("warning");
  emit("delete", props.expense.id);
};
</script>

<template>
  <ReceiptCard side-cut-offset="70px" class="w-full">
    <!-- ШТРИХКОД И СТАТУС ОПЛАТЫ -->
    <div
      class="flex flex-col gap-1 items-center justify-center pt-5 cursor-pointer select-none"
      @click="toggleExpand"
    >
      <ReceiptBarcode />
      <div class="w-full px-5" @click="toggleExpand">
        <div class="flex items-center justify-between">
          <span class="pt-1 text-[13px] font-semibold text-text-secondary"
            >Чек №{{ formattedReceiptNumber }}</span
          >
          <span
            class="text-[15px] font-semibold text-black tracking-[0.2em] uppercase"
          >
            Оплачено
          </span>
          <span class="pt-1 text-[13px] font-semibold text-text-secondary">
            {{ displayDate }}
          </span>
        </div>
        <div
          class="text-left text-text-secondary text-sm truncate"
          :title="`Оплатил: ${payerDisplayName} • ${displayDate}`"
        >
          Оплатил:
          <strong class="text-text-primary font-semibold">
            {{ payerDisplayName }}
          </strong>
        </div>
      </div>
    </div>

    <!-- ШАПКА ЧЕКА: НАЗВАНИЕ, ОБЩАЯ СУММА, ПЛАТЕЛЬЩИК И ДАТА -->
    <div class="mt-1 px-5 cursor-pointer select-none" @click="toggleExpand">
      <div class="flex items-baseline justify-between gap-3">
        <div class="min-w-0 flex-1">
          <span
            class="text-text-primary font-bold text-xl truncate"
            :title="expense.title"
          >
            {{ expense.title }}
          </span>
        </div>
        <div class="text-right shrink-0">
          <span
            class="font-bold text-lg text-text-primary whitespace-nowrap tabular-nums"
          >
            {{ formatAmount(expense.amount) }}
          </span>
        </div>
      </div>
    </div>

    <!-- ВЕРХНИЙ ПУНКТИРНЫЙ РАЗДЕЛИТЕЛЬ -->
    <ReceiptDivider variant="dotted" class="px-5 my-2" />

    <!-- ИНТЕРАКТИВНЫЙ ПЕРЕКЛЮЧАТЕЛЬ СЕРЕДИНЫ (ЧИСЛО УЧАСТНИКОВ) -->
    <button
      type="button"
      class="w-full px-5 flex items-center justify-between text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer select-none"
      @click="toggleExpand"
    >
      <span class="font-medium text-[14px]">
        {{ expense.shares.length }}
        {{
          pluralize(expense.shares.length, [
            "участник",
            "участника",
            "участников",
          ])
        }}
      </span>
      <span
        class="inline-flex items-center gap-0.5 text-xs text-text-accent font-semibold"
      >
        <span>{{ isExpanded ? "Свернуть" : "Раскрыть" }}</span>
        <component
          :is="isExpanded ? ChevronUp : ChevronDown"
          class="size-3.5 transition-transform duration-200"
        />
      </span>
    </button>

    <!-- СЕРЕДИНА ЧЕКА (РАСКРЫВАЮЩАЯСЯ ДЕТАЛИЗАЦИЯ ДОЛЕЙ) -->
    <div
      class="grid transition-all duration-300 ease-in-out"
      :class="
        isExpanded
          ? 'grid-rows-[1fr] opacity-100'
          : 'grid-rows-[0fr] opacity-0 pointer-events-none'
      "
    >
      <div class="overflow-hidden px-5 flex flex-col gap-2 pb-2">
        <!-- Список долей с ресторанными отточиями (Dot Leaders) -->
        <div class="flex flex-col gap-1.5 pt-1.5">
          <div
            v-for="(g, idx) in groupedShares"
            :key="idx"
            class="flex items-baseline justify-between text-xs text-text-secondary w-full"
          >
            <!-- Имена участников (сгруппированные через запятую) -->
            <span
              class="text-text-primary font-medium min-w-0 truncate shrink"
              :title="g.members.map((m) => m.displayName).join(', ')"
            >
              {{ g.members.map((m) => m.displayName).join(", ") }}
            </span>

            <!-- Пунктирные отточия между именем и ценой -->
            <span
              class="flex-1 border-b border-dotted border-text-secondary/40 mx-0.5 mb-1 min-w-5"
            />

            <!-- Блок суммы доли с выравниванием чисел строго друг под другом -->
            <div class="flex items-baseline shrink-0">
              <span
                v-if="g.members.length > 1"
                class="text-text-secondary font-normal text-[11px] shrink-0 tabular-nums mr-1"
              >
                {{ g.members.length > 1 ? "по" : "" }}
              </span>
              <span
                class="font-bold text-text-primary shrink-0 tabular-nums whitespace-nowrap text-right"
              >
                {{ formatAmount(g.amount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Выделенный блок «Ваша доля» в виде реалистичного мазка маркера-выделителя -->
        <div
          v-if="myShare > 0"
          class="relative mx-auto px-2 py-1 inline-flex items-center justify-center select-none rotate-[-0.5deg]"
        >
          <!-- Скошенный полупрозрачный след маркера (Chisel-Tip Highlighter) -->
          <svg
            class="absolute -inset-x-2 -inset-y-0.5 w-[calc(100%+16px)] h-[calc(100%+4px)] pointer-events-none z-0"
            viewBox="0 0 220 32"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                :id="`marker-highlight-${expense.id}`"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stop-color="#be123c" stop-opacity="0.18" />
                <stop offset="75%" stop-color="#be123c" stop-opacity="0.23" />
                <stop offset="100%" stop-color="#be123c" stop-opacity="0.3" />
              </linearGradient>
            </defs>
            <!-- След войлочного пера маркера со скошенными краями (~20°) и наплывом чернил -->
            <path
              d="M 10,4.5
                 C 10,4.5 120,3.2 214,4
                 C 217,4.2 218,6 217,9
                 L 211,26
                 C 210,28 208,28.5 205,28.5
                 C 130,29 30,28.5 6,28
                 C 3,28 2,26 3,23
                 L 8,6
                 C 8.5,4.8 9.2,4.5 10,4.5 Z"
              :fill="`url(#marker-highlight-${expense.id})`"
            />
          </svg>

          <!-- Текст поверх маркера -->
          <div class="relative z-10 flex items-baseline gap-1.5">
            <span class="text-xs text-text-secondary"> Ваша доля: </span>
            <span
              class="font-bold text-text-accent tracking-wide"
              :class="amountsTextSize"
            >
              {{ formatAmount(myShare) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- НИЖНИЕ КНОПКИ ДЕЙСТВИЙ (В СТИЛЕ GLASS-PILL) -->
    <template #footer>
      <div class="px-5 pt-2 pb-5.5 flex items-center justify-between gap-2.5">
        <!-- Кнопка «Записать себе» в личный бюджет FINO -->
        <GlassButton
          v-if="myShare > 0"
          type="button"
          variant="soft"
          size="sm"
          class="h-auto flex-1 px-4 py-2 text-text-accent text-sm transition-all flex items-center justify-center gap-1.5"
          title="Внести свою долю в расходы FINO"
          @click.stop="handleExport"
        >
          <NotebookPen class="size-4 shrink-0" :stroke-width="1.5" />
          <span>Записать себе</span>
        </GlassButton>

        <!-- Заглушка для центрирования, если доли нет -->
        <div v-else class="flex-1" />

        <!-- Кнопка редактирования расхода -->
        <GlassButton
          type="button"
          variant="soft"
          class="h-auto p-2.5 rounded-full text-text-secondary hover:text-text-primary transition-all flex items-center justify-center shrink-0"
          title="Редактировать расход"
          @click.stop="handleEdit"
        >
          <Pencil class="size-4.25" :stroke-width="1.75" />
        </GlassButton>

        <!-- Кнопка удаления расхода -->
        <GlassButton
          type="button"
          variant="soft"
          class="h-auto p-2.5 rounded-full text-text-accent transition-all flex items-center justify-center shrink-0"
          title="Удалить расход"
          @click.stop="handleDelete"
        >
          <Trash2 class="size-4.25" :stroke-width="1.75" />
        </GlassButton>
      </div>
    </template>
  </ReceiptCard>
</template>

<style scoped></style>
