<script setup lang="ts">
/**
 * @module app/components/split/AddMemberModal
 * @fileoverview Модальное окно добавления нового участника в существующую группу
 * @description
 * Предоставляет форму ввода имени участника и опционального Telegram username.
 * При вводе username система связывает участника с аккаунтом FINO для Telegram-уведомлений.
 * ---
 * ### Логика работы:
 * 1. Получение имени и Telegram username от пользователя.
 * 2. Вызов `addMember` из `useSplit` для сохранения в базе данных.
 * 3. Очистка полей ввода, отправка события `added` и закрытие модалки.
 */
import { ref, watch } from "vue";

const props = defineProps<{
  isOpen: boolean;
  groupId: string;
}>();

const emit = defineEmits<{
  (e: "close" | "added"): void;
}>();

const { addMember } = useSplit();

const name = ref("");
const telegramUsername = ref("");
const buttonState = ref<"idle" | "loading" | "success">("idle");

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      buttonState.value = "idle";
    }
  },
);

const handleSubmit = async () => {
  if (!name.value.trim() || buttonState.value === "loading") return;

  buttonState.value = "loading";
  try {
    const result = await addMember(
      props.groupId,
      name.value.trim(),
      telegramUsername.value.trim() || undefined,
    );

    if (result) {
      buttonState.value = "success";
      setTimeout(() => {
        name.value = "";
        telegramUsername.value = "";
        emit("added");
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
    title="Новый участник"
    position="bottom"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-3">
        <GlassInput
          v-model="name"
          label="Имя участника"
          placeholder="Например: Саша"
          required
          autofocus
        />

        <GlassInput
          v-model="telegramUsername"
          label="Telegram username (опционально)"
          placeholder="@username"
        />
        <p class="text-[11px] text-text-secondary -mt-1">
          Если указать username, бот сможет отправлять участнику уведомления о
          расчете долгов.
        </p>
      </div>

      <div class="flex items-center justify-end gap-2">
        <GlassButton
          size="sm"
          type="button"
          variant="soft"
          class="px-6.5"
          @click="emit('close')"
        >
          Отмена
        </GlassButton>
        <GlassMorphButton
          type="submit"
          size="sm"
          :state="buttonState"
          :disabled="!name.trim()"
        >
          <span class="text-base">Добавить</span>
        </GlassMorphButton>
      </div>
    </form>
  </GlassModal>
</template>
