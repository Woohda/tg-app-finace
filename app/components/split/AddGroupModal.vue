<script setup lang="ts">
/**
 * @module app/components/split/AddGroupModal
 * @fileoverview Модальное окно создания новой группы совместных трат
 * @description
 * Предоставляет форму ввода названия группы и добавления стартового списка участников
 * с интерактивными чипсами и быстрым удалением перед созданием группы в базе данных.
 * ---
 * ### Логика работы:
 * 1. Ввод названия группы и добавление имен участников через поле ввода или клавишу Enter.
 * 2. Отображение списка добавленных участников с возможностью удаления.
 * 3. Валидация и отправка данных в `createGroup` из `useSplit`.
 * 4. Оповещение родительского компонента событием `created` с ID новой группы и закрытие окна.
 */
import { ref, watch } from "vue";
import { Plus } from "@lucide/vue";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "created", groupId: string): void;
}>();

const { createGroup } = useSplit();

const name = ref("");
const newMemberName = ref("");
const members = ref<string[]>([]);
const buttonState = ref<"idle" | "loading" | "success">("idle");

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      buttonState.value = "idle";
    }
  },
);

const addMember = () => {
  const trimmed = newMemberName.value.trim();
  if (trimmed && !members.value.includes(trimmed)) {
    members.value.push(trimmed);
    newMemberName.value = "";
  }
};

const removeMember = (_member: unknown, index: number) => {
  members.value.splice(index, 1);
};

const handleSubmit = async () => {
  if (!name.value.trim() || buttonState.value === "loading") return;

  buttonState.value = "loading";
  try {
    const result = await createGroup(name.value.trim(), members.value);
    if (result) {
      buttonState.value = "success";
      setTimeout(() => {
        const id = result.id;
        name.value = "";
        members.value = [];
        newMemberName.value = "";
        emit("created", id);
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
    title="Новая группа трат"
    position="bottom"
    @close="emit('close')"
  >
    <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <GlassInput
        v-model="name"
        label="Название группы"
        placeholder="Например: Поездка в горы, Бар..."
        autofocus
        required
      />

      <!-- Список участников -->
      <div class="flex flex-col gap-2 px-1">
        <label class="text-xs font-medium text-text-secondary">
          Участники (вы уже включены):
        </label>

        <GroupMembersChips
          :members="members"
          creator-badge="👤 Вы (Создатель)"
          removable
          @remove="removeMember"
        />

        <!-- Добавление участника -->
        <div class="flex items-center gap-2 mt-1">
          <div class="flex-1">
            <GlassInput
              v-model="newMemberName"
              placeholder="Имя друга (например: Алексей)"
              @keydown.enter.prevent="addMember"
            />
          </div>
          <GlassButton
            type="button"
            variant="soft"
            size="sm"
            class="px-2.75 shrink-0"
            @click="addMember"
          >
            <Plus class="size-5 text-text-accent" :stroke-width="1.5" />
          </GlassButton>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
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
          <span class="text-base">Создать группу</span>
        </GlassMorphButton>
      </div>
    </form>
  </GlassModal>
</template>
