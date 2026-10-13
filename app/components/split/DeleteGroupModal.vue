<script setup lang="ts">
/**
 * @module app/components/split/DeleteGroupModal
 * @fileoverview Модальное окно подтверждения удаления группы совместных платежей
 * @description
 * Предоставляет диалог подтверждения удаления группы с каскадным удалением
 * всех связанных участников, расходов и расчетов.
 * Использует морфинг-кнопку `GlassMorphButton` (variant="delete") для подтверждения.
 * ---
 * ### Логика работы:
 * 1. Получение объекта удаляемой группы через входной параметр `group`.
 * 2. Вызов метода `deleteGroup` из `useSplit` при нажатии кнопки подтверждения.
 * 3. Анимация успеха и отправка события `deleted` для редиректа на список групп.
 */
import { ref, watch } from "vue";
import { AlertTriangle, Flame } from "@lucide/vue";
import type { SplitGroupDetail, SplitGroupSummary } from "~/types/split";

const props = defineProps<{
  isOpen: boolean;
  group: SplitGroupDetail | SplitGroupSummary | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "deleted", groupId: string): void;
}>();

const { deleteGroup } = useSplit();
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
  if (!props.group || buttonState.value !== "idle") return;

  buttonState.value = "loading";
  try {
    const success = await deleteGroup(props.group.id);
    if (success) {
      buttonState.value = "success";
      setTimeout(() => {
        emit("deleted", props.group!.id);
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
    title="Удаление группы"
    position="bottom"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-3">
      <p class="text-base text-center text-text-primary leading-relaxed">
        Вы уверены, что хотите удалить группу
        <strong class="text-text-primary font-bold">
          «{{ group?.name }}» </strong
        >?
      </p>

      <div
        class="flex items-start gap-2 text-[11px] text-text-secondary leading-snug p-2.5 rounded-2xl bg-text-accent/5 border border-text-accent/15"
      >
        <AlertTriangle
          class="text-xs text-text-accent shrink-0 select-none"
          :stroke-width="1.5"
        />
        <span>
          Все записанные совместные платежи, доли участников и история расчетов
          будут безвозвратно удалены.
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
