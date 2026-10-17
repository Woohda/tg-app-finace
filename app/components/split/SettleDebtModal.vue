<script setup lang="ts">
/**
 * @module app/components/split/SettleDebtModal
 * @fileoverview Модальное окно фиксации возврата долга (расчета)
 * @description
 * Поддерживает два сценария работы:
 * 1. Быстрое подтверждение в 1 клик при нажатии на рассчитанный перевод из списка оптимизированных долгов.
 * 2. Ручной ввод для фиксации произвольного перевода между участниками группы.
 * ---
 * ### Логика работы:
 * 1. Если передан `defaultTransfer`, открывается компактная шторка-подтверждение без лишних полей.
 * 2. По клику на «Подтвердить» долг сразу фиксируется в БД через `addSettlement`.
 * 3. При необходимости пользователь может переключиться в ручной режим для корректировки суммы.
 */
import { ref, watch, computed } from "vue";
import { RussianRuble } from "@lucide/vue";
import type { SplitMember, SplitDebtTransfer } from "~/types/split";
import {
  validateSettleDebtForm,
  isValidAmount,
  getAmountInputError,
} from "~/utils/validation";

const props = defineProps<{
  isOpen: boolean;
  groupId: string;
  members: SplitMember[];
  defaultTransfer?: SplitDebtTransfer | null;
}>();

const emit = defineEmits<{
  (e: "close" | "saved"): void;
}>();

const { addSettlement } = useSplit();

const fromMemberId = ref("");
const toMemberId = ref("");
const amount = ref<string | number>("");
const buttonState = ref<"idle" | "loading" | "success">("idle");
const isCustomMode = ref(false);

const currentMemberId = computed(
  () => props.members.find((m) => m.is_current_user)?.id,
);

const isMe = (memberId: string, memberName: string): boolean => {
  return Boolean(
    (currentMemberId.value && memberId === currentMemberId.value) ||
    memberName.trim().toLowerCase() === "я",
  );
};

const getFromLabel = (t: SplitDebtTransfer): string =>
  isMe(t.fromMemberId, t.fromMemberName) ? "я" : t.fromMemberName;

const getToLabel = (t: SplitDebtTransfer): string =>
  isMe(t.toMemberId, t.toMemberName) ? "мне" : t.toMemberName;

const submitError = ref("");

watch([amount, fromMemberId, toMemberId], () => {
  submitError.value = "";
});

const isFormValid = computed(() => {
  return isValidAmount(amount.value);
});

const isSubmitDisabled = computed(() => {
  return !isFormValid.value || buttonState.value !== "idle";
});

const displayError = computed(() => {
  const amountErr = getAmountInputError(amount.value);
  if (amountErr) return amountErr;
  return submitError.value;
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      buttonState.value = "idle";
      submitError.value = "";
      isCustomMode.value = false;
      if (props.defaultTransfer) {
        fromMemberId.value = props.defaultTransfer.fromMemberId;
        toMemberId.value = props.defaultTransfer.toMemberId;
        amount.value = props.defaultTransfer.amount;
      } else {
        fromMemberId.value = props.members[0]?.id || "";
        toMemberId.value = props.members[1]?.id || "";
        amount.value = "";
      }
    }
  },
  { immediate: true },
);

const saveSettlement = async (payload: {
  from_member_id: string;
  to_member_id: string;
  amount: number;
}) => {
  buttonState.value = "loading";
  try {
    const result = await addSettlement(props.groupId, {
      ...payload,
      date: formatDateISO(),
    });

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

const handleQuickConfirm = () => {
  if (!props.defaultTransfer || buttonState.value !== "idle") return;
  saveSettlement({
    from_member_id: props.defaultTransfer.fromMemberId,
    to_member_id: props.defaultTransfer.toMemberId,
    amount: props.defaultTransfer.amount,
  });
};

const handleFormSubmit = () => {
  if (!isFormValid.value || buttonState.value !== "idle") return;

  const validRes = validateSettleDebtForm({
    fromMemberId: fromMemberId.value,
    toMemberId: toMemberId.value,
    amount: amount.value,
  });

  if (!validRes.success) {
    submitError.value = validRes.error;
    return;
  }

  saveSettlement(validRes.data);
};

const handleClose = () => {
  if (buttonState.value !== "idle") return;
  emit("close");
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    :title="
      defaultTransfer && !isCustomMode
        ? 'Подтверждение перевода'
        : 'Зафиксировать перевод'
    "
    position="bottom"
    :disable-close="buttonState !== 'idle'"
    @close="handleClose"
  >
    <!-- Быстрое подтверждение в 1 клик -->
    <div v-if="defaultTransfer && !isCustomMode" class="flex flex-col gap-4">
      <p
        class="text-text-secondary text-sm leading-relaxed max-w-xs text-center mx-auto"
      >
        Зафиксировать, что
        <strong class="text-text-accent">{{
          getFromLabel(defaultTransfer)
        }}</strong>
        перевел
        <strong class="text-accent-success">{{
          getToLabel(defaultTransfer)
        }}</strong>
        &nbsp;
        <strong class="text-text-primary">
          {{ formatAmount(defaultTransfer.amount) }}</strong
        >?
      </p>

      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <GlassButton
            type="button"
            variant="soft"
            size="sm"
            class="px-6.5"
            :disabled="buttonState !== 'idle'"
            @click="handleClose"
          >
            Отмена
          </GlassButton>
          <GlassMorphButton
            type="button"
            size="sm"
            :state="buttonState"
            @click="handleQuickConfirm"
          >
            <span>Подтвердить</span>
          </GlassMorphButton>
        </div>

        <button
          type="button"
          class="text-[11px] text-text-secondary hover:text-text-primary transition-colors py-1 text-center"
          @click="isCustomMode = true"
        >
          Изменить сумму или участников
        </button>
      </div>
    </div>

    <!-- Полная форма (при ручном создании или редактировании) -->
    <form
      v-else
      class="flex flex-col gap-4 p-1 pb-2"
      @submit.prevent="handleFormSubmit"
    >
      <div class="flex flex-col gap-3">
        <!-- Кто перевел -->
        <GlassMemberSelect
          v-model="fromMemberId"
          label="Кто перевел (должник)"
          :members="members"
        />

        <!-- Кому перевел -->
        <GlassMemberSelect
          v-model="toMemberId"
          label="Кому перевел (получатель)"
          :members="members"
        />

        <!-- Сумма -->
        <GlassInput
          v-model="amount"
          type="number"
          inputmode="decimal"
          step="0.01"
          label="Сумма перевода"
          placeholder="0.00"
          required
          :icon="RussianRuble"
        />
      </div>

      <div
        v-if="displayError"
        class="text-text-accent text-xs font-medium text-center -mt-1"
      >
        {{ displayError }}
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <GlassButton
          type="button"
          variant="soft"
          size="sm"
          class="px-6.5"
          :disabled="buttonState !== 'idle'"
          @click="defaultTransfer ? (isCustomMode = false) : handleClose()"
        >
          {{ defaultTransfer ? "Назад" : "Отмена" }}
        </GlassButton>
        <GlassMorphButton
          type="submit"
          size="sm"
          :state="buttonState"
          :disabled="isSubmitDisabled"
        >
          <span class="text-sm">Подтвердить перевод</span>
        </GlassMorphButton>
      </div>
    </form>
  </GlassModal>
</template>
