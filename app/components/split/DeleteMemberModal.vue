<script setup lang="ts">
/**
 * @module app/components/split/DeleteMemberModal
 * @fileoverview Модальное окно подтверждения удаления участника из группы
 * @description
 * Отображает диалог подтверждения удаления выбранного участника из группы совместных трат.
 * Использует морфинг-кнопку `GlassMorphButton` (variant="delete") с анимацией состояний
 * и тактильным откликом при успешном удалении.
 * ---
 * ### Логика работы:
 * 1. Проверка условий удаления (участник не должен иметь записанных расходов или долей).
 * 2. Вызов метода `deleteMember` из `useSplit` при нажатии на кнопку удаления.
 * 3. Морфинг кнопки в состояние успеха со слотом пламени и отправка события `deleted`.
 */
import { ref, watch } from "vue";
import { SquareExclamationPoint, Flame } from "@lucide/vue";
import type { SplitMember } from "~/types/split";

const props = defineProps<{
  isOpen: boolean;
  groupId: string;
  member: SplitMember | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "deleted", memberId: string): void;
}>();

const { deleteMember } = useSplit();
const buttonState = ref<"idle" | "loading" | "success">("idle");

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      buttonState.value = "idle";
    }
  },
);

const handleConfirm = async () => {
  if (!props.member || buttonState.value !== "idle") return;

  buttonState.value = "loading";
  try {
    const success = await deleteMember(props.groupId, props.member.id);
    if (success) {
      buttonState.value = "success";
      setTimeout(() => {
        emit("deleted", props.member!.id);
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
    title="Удаление участника"
    position="bottom"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-3">
      <p class="text-base text-center text-text-primary leading-relaxed">
        Вы уверены, что хотите удалить участника
        <strong class="text-text-primary font-bold">
          {{ member?.name }}
        </strong>
        из группы?
      </p>

      <div
        class="flex items-start gap-1.5 text-[11px] text-text-secondary leading-snug"
      >
        <SquareExclamationPoint
          class="text-xs text-text-accent shrink-0 select-none stroke-1.5"
        />
        <span>
          Участника можно удалить только в том случае, если он не оплачивал
          расходы и не участвует в текущих долях затрат группы.
        </span>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
        <GlassButton
          type="button"
          variant="soft"
          size="sm"
          class="px-6.5"
          @click="emit('close')"
        >
          Отмена
        </GlassButton>

        <GlassMorphButton
          variant="delete"
          size="sm"
          :state="buttonState"
          @click="handleConfirm"
        >
          <span class="text-base">Удалить</span>
          <template #success>
            <Flame :stroke-width="1.5" />
          </template>
        </GlassMorphButton>
      </div>
    </div>
  </GlassModal>
</template>
