<script setup lang="ts">
/**
 * @module app/components/split/AddExpenseModal
 * @fileoverview Модальное окно добавления и редактирования совместного расхода
 * @description
 * Обеспечивает форму создания и редактирования расхода с выбором плательщика через чипсы `GroupMembersChips`,
 * вводом суммы и гибким гибридным распределением (весовые доли или фиксированные суммы в рублях).
 * ---
 * ### Логика работы:
 * 1. Ввод названия, суммы чека и выбор плательщика с помощью интерактивных чипсов.
 * 2. Выбор участников, участвующих в оплате чека, с возможностью переключения между долями и точными суммами в рублях.
 * 3. Динамический предварительный расчет долей через `calculateHybridShares` с отображением остатка чека.
 * 4. Сохранение расхода через `addExpense` или `updateExpense` из `useSplit` и закрытие модалки.
 */
import { ref, computed, watch } from "vue";
import type { SplitMember, SplitExpense } from "~/types/split";
import { calculateHybridShares, roundCurrency } from "~/utils/splitAlgorithm";
import { formatAmount } from "~/utils/format";
import { RussianRuble } from "@lucide/vue";

const props = defineProps<{
  isOpen: boolean;
  groupId: string;
  members: SplitMember[];
  expenseToEdit?: SplitExpense | null;
}>();

const emit = defineEmits<{
  (e: "close" | "saved"): void;
}>();

const { addExpense, updateExpense } = useSplit();

const title = ref("");
const amount = ref<string | number>("");
const payerId = ref("");

const selectedMemberIds = ref<string[]>([]);

const memberWeights = ref<Record<string, number>>({});
const memberFixed = ref<Record<string, boolean>>({});
const memberFixedAmounts = ref<Record<string, number>>({});
const buttonState = ref<"idle" | "loading" | "success">("idle");

const isEditing = computed(() => Boolean(props.expenseToEdit));

// Инициализация при открытии модального окна
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      buttonState.value = "idle";

      if (props.expenseToEdit) {
        title.value = props.expenseToEdit.title;
        amount.value = props.expenseToEdit.amount;
        payerId.value = props.expenseToEdit.payer_id;

        // Выбранные участники
        selectedMemberIds.value = props.expenseToEdit.shares.map(
          (s) => s.member_id,
        );

        // Инициализируем веса долей и фиксированные суммы
        const weightsObj: Record<string, number> = {};
        const fixedObj: Record<string, boolean> = {};
        const fixedAmountsObj: Record<string, number> = {};

        props.members.forEach((m) => {
          const existingShare = props.expenseToEdit?.shares.find(
            (s) => s.member_id === m.id,
          );
          if (
            props.expenseToEdit?.split_type === "shares" &&
            existingShare &&
            (existingShare.share_value === null ||
              existingShare.share_value === undefined)
          ) {
            fixedObj[m.id] = true;
            fixedAmountsObj[m.id] = existingShare.amount;
            weightsObj[m.id] = 1;
          } else {
            fixedObj[m.id] = false;
            fixedAmountsObj[m.id] = existingShare?.amount || 0;
            weightsObj[m.id] =
              existingShare?.share_value && existingShare.share_value > 0
                ? existingShare.share_value
                : 1;
          }
        });
        memberWeights.value = weightsObj;
        memberFixed.value = fixedObj;
        memberFixedAmounts.value = fixedAmountsObj;
      } else {
        title.value = "";
        amount.value = "";

        // По умолчанию плательщик — текущий пользователь (или первый участник)
        const currentUser = props.members.find((m) => m.is_current_user);
        payerId.value = currentUser
          ? currentUser.id
          : props.members[0]?.id || "";

        // По умолчанию в сплите участвуют все
        selectedMemberIds.value = props.members.map((m) => m.id);

        // Инициализируем shares
        const weightsObj: Record<string, number> = {};
        const fixedObj: Record<string, boolean> = {};
        const fixedAmountsObj: Record<string, number> = {};
        props.members.forEach((m) => {
          weightsObj[m.id] = 1;
          fixedObj[m.id] = false;
          fixedAmountsObj[m.id] = 0;
        });
        memberWeights.value = weightsObj;
        memberFixed.value = fixedObj;
        memberFixedAmounts.value = fixedAmountsObj;
      }
    }
  },
  { immediate: true },
);

const numAmount = computed(() => {
  const parsed = parseAmount(amount.value);
  return isNaN(parsed) ? 0 : parsed;
});

// Переключение фиксации суммы в рублях для конкретного участника
const toggleMemberFixed = (memberId: string) => {
  const currentFixed = Boolean(memberFixed.value[memberId]);
  if (!currentFixed) {
    memberFixed.value[memberId] = true;
    const currentShare = previewShares.value[memberId] || 0;
    if (
      !memberFixedAmounts.value[memberId] ||
      Number(memberFixedAmounts.value[memberId]) <= 0
    ) {
      memberFixedAmounts.value[memberId] = currentShare > 0 ? currentShare : 0;
    }
  } else {
    memberFixed.value[memberId] = false;
    if (!memberWeights.value[memberId] || memberWeights.value[memberId] <= 0) {
      memberWeights.value[memberId] = 1;
    }
  }
};

// Предварительный расчет долей для отображения (Гибридный сплит)
const previewShares = computed(() => {
  if (numAmount.value <= 0) return {};

  const hybridItems = selectedMemberIds.value.map((id) => ({
    memberId: id,
    isFixed: Boolean(memberFixed.value[id]),
    fixedAmount: Number(memberFixedAmounts.value[id]) || 0,
    weight: Number(memberWeights.value[id]) || 1,
  }));

  return calculateHybridShares(numAmount.value, hybridItems);
});

// Сумма всех зафиксированных долей
const totalFixedAmount = computed(() => {
  return selectedMemberIds.value.reduce((sum, id) => {
    if (memberFixed.value[id]) {
      return sum + (Number(memberFixedAmounts.value[id]) || 0);
    }
    return sum;
  }, 0);
});

// Есть ли хоть один зафиксированный участник
const hasAnyFixed = computed(() => {
  return selectedMemberIds.value.some((id) => memberFixed.value[id]);
});

// Количество участников с долями
const weightedMembersCount = computed(() => {
  return selectedMemberIds.value.filter((id) => !memberFixed.value[id]).length;
});

// Сумма весов незафиксированных участников
const totalWeightsCount = computed(() => {
  return selectedMemberIds.value.reduce((sum, id) => {
    if (!memberFixed.value[id]) {
      return sum + (Number(memberWeights.value[id]) || 1);
    }
    return sum;
  }, 0);
});

// Остаток для распределения по долям
const remainingAmount = computed(() => {
  return roundCurrency(numAmount.value - totalFixedAmount.value);
});

const isFormValid = computed(() => {
  if (!title.value.trim() || numAmount.value <= 0 || !payerId.value) {
    return false;
  }
  if (selectedMemberIds.value.length === 0) {
    return false;
  }
  // Если зафиксированные суммы превышают общий чек
  if (hasAnyFixed.value) {
    if (remainingAmount.value < -0.01) {
      return false;
    }
    // Если остаток есть, но некому его разделить
    if (remainingAmount.value > 0.01 && weightedMembersCount.value === 0) {
      return false;
    }
  }
  return true;
});

const toggleMember = (memberId: string) => {
  const index = selectedMemberIds.value.indexOf(memberId);
  if (index >= 0) {
    if (selectedMemberIds.value.length > 1) {
      selectedMemberIds.value.splice(index, 1);
    }
  } else {
    selectedMemberIds.value.push(memberId);
  }
};

const handleSubmit = async () => {
  if (!isFormValid.value || buttonState.value === "loading") return;

  buttonState.value = "loading";
  try {
    const sharesPayload = selectedMemberIds.value.map((id) => {
      const isFixed = Boolean(memberFixed.value[id]);
      return {
        member_id: id,
        is_fixed: isFixed,
        amount: isFixed ? Number(memberFixedAmounts.value[id]) || 0 : undefined,
        share_value: !isFixed ? Number(memberWeights.value[id]) || 1 : null,
      };
    });

    const payload = {
      title: capitalizeFirstLetter(title.value.trim()) || title.value.trim(),
      amount: numAmount.value,
      payer_id: payerId.value,
      split_type: "shares" as const,
      shares: sharesPayload,
      date: props.expenseToEdit?.date || formatDateISO(),
    };

    let result;
    if (props.expenseToEdit) {
      result = await updateExpense(
        props.groupId,
        props.expenseToEdit.id,
        payload,
      );
    } else {
      result = await addExpense(props.groupId, payload);
    }

    if (result) {
      buttonState.value = "success";
      setTimeout(() => {
        emit("saved");
        emit("close");
      }, 500);
    } else {
      buttonState.value = "idle";
    }
  } catch {
    buttonState.value = "idle";
  }
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    :title="isEditing ? 'Редактировать расход' : 'Новый совместный расход'"
    position="bottom"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <!-- Название и сумма -->
      <div class="flex flex-col gap-3">
        <GlassInput
          v-model="title"
          label="За что заплатили"
          placeholder="Например: Ужин, Такси, Отель..."
          required
          autofocus
        />

        <GlassInput
          v-model="amount"
          type="number"
          inputmode="decimal"
          step="0.01"
          label="Сумма (₽)"
          placeholder="0.00"
          :icon="RussianRuble"
          required
        />
      </div>

      <!-- Кто заплатил -->
      <div class="flex flex-col gap-1.5 px-0.5">
        <label class="text-xs font-medium text-text-secondary"
          >Кто оплатил:</label
        >
        <GroupMembersChips v-model="payerId" :members="members" selectable />
      </div>

      <!-- Участники сплита и доли -->
      <div class="flex flex-col gap-2">
        <label class="text-xs font-medium text-text-secondary">
          Участники расхода ({{ selectedMemberIds.length }} из
          {{ members.length }}):
        </label>

        <div
          class="flex flex-col gap-2 max-h-56 overflow-y-auto scrollbar-hide pr-1"
        >
          <div
            v-for="m in members"
            :key="m.id"
            class="py-1 flex items-center justify-between transition-all"
            :class="{ 'opacity-50': !selectedMemberIds.includes(m.id) }"
          >
            <!-- Чекбокс и имя -->
            <GlassCheckbox
              class="flex-1 min-w-0"
              :checked="selectedMemberIds.includes(m.id)"
              :title="m.name"
              @change="toggleMember(m.id)"
            >
              {{ m.name }}
            </GlassCheckbox>

            <!-- Доля участника (гибридный сплит) -->
            <div
              v-if="selectedMemberIds.includes(m.id)"
              class="shrink-0 flex items-center gap-1.5"
            >
              <!-- Рассчитанная сумма доли (если участник в режиме долей) -->
              <span
                v-if="!memberFixed[m.id]"
                class="text-xs font-semibold text-text-secondary min-w-16 text-right"
              >
                {{ formatAmount(previewShares[m.id] || 0) }}
              </span>

              <!-- Инпут веса или фиксированной суммы с кнопкой-тумблером -->
              <div
                class="flex items-center glass-pill rounded-xl px-1 py-px transition-all a11y-focus"
              >
                <!-- Ввод количества долей -->
                <input
                  v-if="!memberFixed[m.id]"
                  v-model.number="memberWeights[m.id]"
                  type="number"
                  min="0.5"
                  step="0.5"
                  class="w-11 text-center text-xs font-bold py-1 outline-none text-text-primary a11y-focus"
                  title="Количество долей"
                />

                <!-- Ввод точной суммы в рублях -->
                <input
                  v-else
                  v-model.number="memberFixedAmounts[m.id]"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  class="w-18 text-center text-xs font-bold py-1 outline-none text-text-accent a11y-focus"
                  title="Фиксированная сумма в рублях"
                />

                <!-- Переключатель режима: доля vs ₽ фикс -->
                <button
                  type="button"
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-lg transition-all flex items-center gap-0.5 select-none cursor-pointer a11y-focus"
                  :class="[
                    memberFixed[m.id]
                      ? 'bg-text-accent text-white'
                      : 'text-text-secondary active:scale-95',
                  ]"
                  :title="
                    memberFixed[m.id]
                      ? 'Зафиксировано в рублях (нажмите, чтобы считать по долям)'
                      : 'Считается по долям (нажмите, чтобы зафиксировать в рублях)'
                  "
                  @click.stop="toggleMemberFixed(m.id)"
                >
                  <span>{{ memberFixed[m.id] ? "₽ фикс" : "доля" }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Подсказка / Информационная плашка (сменяют друг друга) -->
      <!-- Подсказка по умолчанию (если ничего не зафиксировано) -->
      <div
        v-if="!hasAnyFixed"
        class="text-center text-text-secondary leading-snug transition-all text-[10px]"
      >
        <span>
          Вы можете менять доли или нажать
          <span
            class="font-semibold text-text-primary underline decoration-dotted underline-offset-2 tracking-wider"
            >«доля»</span
          >, чтобы зафиксировать точную сумму в рублях вручную (остаток чека
          автоматически разделится между остальными).
        </span>
      </div>

      <!-- Информационная плашка гибридного сплита (когда есть фиксированная сумма) -->
      <div
        v-else
        class="text-xs flex flex-col gap-1.5 transition-all"
        :class="[
          remainingAmount < -0.01
            ? 'rounded-2xl px-2.5 py-1.5 bg-accent-start/5 border border-accent-mid/20 text-accent-mid'
            : 'text-text-secondary',
        ]"
      >
        <div class="flex items-center justify-between">
          <span>
            Зафиксировано:
            <strong class="text-text-primary font-bold">
              {{ formatAmount(totalFixedAmount) }}
            </strong>
          </span>
          <span>
            Остаток:
            <strong
              :class="
                remainingAmount < -0.01
                  ? 'text-accent-mid font-bold'
                  : 'text-text-accent font-bold'
              "
            >
              {{ formatAmount(Math.max(0, remainingAmount)) }}
            </strong>
          </span>
        </div>

        <p
          v-if="remainingAmount < -0.01"
          class="text-[11px] text-accent-mid font-medium"
        >
          Фиксированные суммы превышают общий чек на
          {{ formatAmount(Math.abs(remainingAmount)) }}
        </p>
        <p
          v-else-if="weightedMembersCount > 0"
          class="text-[11px] text-text-secondary/80"
        >
          Остаток {{ formatAmount(remainingAmount) }} делится на
          {{ weightedMembersCount }} чел. ({{ totalWeightsCount }}
          {{ pluralize(totalWeightsCount, ["доля", "доли", "долей"]) }})
        </p>
        <p
          v-else-if="remainingAmount > 0.01"
          class="text-[11px] text-accent-mid font-medium"
        >
          Остаток {{ formatAmount(remainingAmount) }} некому распределить —
          включите доли хотя бы одному участнику
        </p>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
        <GlassButton
          class="px-6.5"
          size="sm"
          type="button"
          variant="soft"
          @click="emit('close')"
        >
          Отмена
        </GlassButton>
        <GlassMorphButton
          type="submit"
          size="sm"
          :state="buttonState"
          :disabled="!isFormValid"
        >
          <span class="text-base">{{
            isEditing ? "Сохранить изменения" : "Добавить расход"
          }}</span>
        </GlassMorphButton>
      </div>
    </form>
  </GlassModal>
</template>
