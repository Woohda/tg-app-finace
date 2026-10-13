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

const numAmount = computed(() => {
  const parsed = parseAmount(amount.value);
  return isNaN(parsed) ? 0 : parsed;
});

const currentMemberId = computed(
  () => props.members.find((m) => m.is_current_user)?.id,
);

const getFromLabel = (t: SplitDebtTransfer): string => {
  const isMe =
    (currentMemberId.value && t.fromMemberId === currentMemberId.value) ||
    t.fromMemberName.trim().toLowerCase() === "я";
  return isMe ? "я" : t.fromMemberName;
};

const getToLabel = (t: SplitDebtTransfer): string => {
  const isMe =
    (currentMemberId.value && t.toMemberId === currentMemberId.value) ||
    t.toMemberName.trim().toLowerCase() === "я";
  return isMe ? "мне" : t.toMemberName;
};

const isFormValid = computed(() => {
  return (
    numAmount.value > 0 &&
    Boolean(fromMemberId.value) &&
    Boolean(toMemberId.value) &&
    fromMemberId.value !== toMemberId.value
  );
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      buttonState.value = "idle";
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

const handleQuickConfirm = async () => {
  if (!props.defaultTransfer || buttonState.value === "loading") return;

  buttonState.value = "loading";
  try {
    const result = await addSettlement(props.groupId, {
      from_member_id: props.defaultTransfer.fromMemberId,
      to_member_id: props.defaultTransfer.toMemberId,
      amount: props.defaultTransfer.amount,
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

const handleFormSubmit = async () => {
  if (!isFormValid.value || buttonState.value === "loading") return;

  buttonState.value = "loading";
  try {
    const result = await addSettlement(props.groupId, {
      from_member_id: fromMemberId.value,
      to_member_id: toMemberId.value,
      amount: numAmount.value,
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
    @close="emit('close')"
  >
    <!-- Быстрое подтверждение в 1 клик -->
    <div v-if="defaultTransfer && !isCustomMode" class="flex flex-col gap-4">
      <div class="flex flex-col items-center gap-2 text-center">
        <h3 class="text-text-primary font-bold text-lg">
          Зафиксировать перевод?
        </h3>
        <p class="text-text-secondary text-sm leading-relaxed max-w-xs">
          Зафиксировать, что
          <span class="font-bold text-text-accent">{{
            getFromLabel(defaultTransfer)
          }}</span>
          перевел
          <span class="font-bold text-accent-success">{{
            getToLabel(defaultTransfer)
          }}</span>

          <span class="font-bold text-text-primary">
            &nbsp;{{ formatAmount(defaultTransfer.amount) }}</span
          >?
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <GlassButton
            type="button"
            variant="soft"
            size="sm"
            class="px-6.5"
            :disabled="buttonState === 'loading'"
            @click="emit('close')"
          >
            Отмена
          </GlassButton>
          <GlassMorphButton
            type="button"
            size="sm"
            :state="buttonState"
            @click="handleQuickConfirm"
          >
            <span class="text-base">Подтвердить</span>
            <template #success>
              <RussianRuble :stroke-width="2" />
            </template>
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
          :disabled-ids="toMemberId ? [toMemberId] : []"
        />

        <!-- Кому перевел -->
        <GlassMemberSelect
          v-model="toMemberId"
          label="Кому перевел (получатель)"
          :members="members"
          :disabled-ids="fromMemberId ? [fromMemberId] : []"
        />

        <!-- Сумма -->
        <GlassInput
          v-model="amount"
          type="number"
          inputmode="decimal"
          step="0.01"
          label="Сумма перевода (₽)"
          placeholder="0.00"
          required
        />
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <GlassButton
          type="button"
          variant="soft"
          size="sm"
          class="px-6.5"
          @click="defaultTransfer ? (isCustomMode = false) : emit('close')"
        >
          {{ defaultTransfer ? "Назад" : "Отмена" }}
        </GlassButton>
        <GlassMorphButton
          type="submit"
          size="sm"
          :state="buttonState"
          :disabled="!isFormValid"
        >
          <span class="text-[15px]">Подтвердить перевод</span>
          <template #success>
            <RussianRuble :stroke-width="2" />
          </template>
        </GlassMorphButton>
      </div>
    </form>
  </GlassModal>
</template>
