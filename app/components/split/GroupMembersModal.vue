<script setup lang="ts">
/**
 * @module app/components/split/GroupMembersModal
 * @fileoverview Модальное окно управления списком участников и настройками группы
 * @description
 * Отображает участников группы в виде компактных стеклянных чипсов (`GroupMembersChips`)
 * с возможностью удаления участников через крестик (с подтверждением) и кнопку
 * каскадного удаления всей группы.
 * ---
 * ### Логика работы:
 * 1. Получение массива участников `members`.
 * 2. Отрисовка участников с помощью чипсов `GroupMembersChips` с крестиками удаления (`removable`).
 * 3. Возможность добавления нового участника через кнопку в слоте `#append`.
 * 4. Кнопка удаления всей группы, отправляющая событие `deleteGroup`.
 */
import { Trash2, UserPlus } from "@lucide/vue";
import type { SplitMember } from "~/types/split";

defineProps<{
  isOpen: boolean;
  members: SplitMember[];
  currentAuthAvatarUrl?: string | null;
}>();

const emit = defineEmits<{
  (e: "close" | "add" | "deleteGroup"): void;
  (e: "remove", member: SplitMember): void;
}>();

const handleRemoveMember = (rawMember: unknown) => {
  emit("remove", rawMember as SplitMember);
};
</script>

<template>
  <GlassModal
    :is-open="isOpen"
    title="Управление группой"
    position="bottom"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-2">
      <!-- Список участников в виде чипсов с крестиками удаления -->
      <div class="flex flex-col gap-2">
        <label class="text-xs font-medium text-text-secondary">
          Состав группы:
        </label>
        <GroupMembersChips
          :members="members"
          removable
          @remove="handleRemoveMember"
        >
          <template #append>
            <GlassButton
              type="button"
              variant="soft"
              class="h-auto flex gap-1 px-3 py-0.5 text-text-accent text-sm"
              title="Добавить участника"
              @click="emit('add')"
            >
              <UserPlus class="size-4" :stroke-width="2" />
              <span>Добавить</span>
            </GlassButton>
          </template>
        </GroupMembersChips>
      </div>

      <!-- Разделитель и кнопка удаления всей группы -->
      <div class="pt-2 border-t border-text-secondary/15 flex flex-col gap-1.5">
        <GlassButton
          variant="soft"
          class="w-full py-2.5 flex items-center justify-center gap-2 text-text-accent font-semibold text-sm transition-all hover:bg-accent-start/10"
          title="Удалить всю группу"
          @click="emit('deleteGroup')"
        >
          <Trash2
            class="size-4 shrink-0 text-text-accent"
            :stroke-width="1.75"
          />
          <span>Удалить группу</span>
        </GlassButton>
      </div>
    </div>
  </GlassModal>
</template>
