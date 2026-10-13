<script setup lang="ts">
/**
 * @module app/components/split/GroupMembersChips
 * @fileoverview Чипсы участников группы совместных трат
 * @description
 * Переиспользуемый компонент для отображения участников группы в виде бейджей/чипсов.
 * Поддерживает:
 * - Режим только для чтения (список участников).
 * - Режим удаления с крестиком (для AddGroupModal и split/[id].vue).
 * - Режим интерактивного выбора (для AddExpenseModal: выбор плательщика).
 * - Опциональный бейдж создателя (для AddGroupModal).
 * - Слот #append для кнопок действий (например, "+ Добавить").
 * ---
 * ### Логика работы:
 * 1. Нормализация входных данных: поддержка строк, объектов `GroupMemberItem` и `SplitMember`.
 * 2. Определение профиля текущего пользователя и визуальное выделение меткой `(Вы)`.
 * 3. Выбор участника через событие `update:modelValue` в интерактивном режиме (`selectable`).
 * 4. Защищенное удаление участников (запрет удаления текущего пользователя) через событие `remove`.
 */
import { computed } from "vue";
import { X } from "@lucide/vue";
import type { SplitMember } from "~/types/split";

export interface GroupMemberItem {
  id?: string;
  name: string;
  is_current_user?: boolean;
}

const props = withDefaults(
  defineProps<{
    members: (SplitMember | GroupMemberItem | string)[];
    creatorBadge?: string;
    removable?: boolean;
    selectable?: boolean;
    modelValue?: string;
  }>(),
  {
    creatorBadge: "",
    removable: false,
    selectable: false,
    modelValue: "",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", id: string): void;
  (
    e: "remove",
    member: SplitMember | GroupMemberItem | string,
    index: number,
  ): void;
}>();

interface NormalizedMember {
  id: string;
  name: string;
  isCurrentUser: boolean;
  raw: SplitMember | GroupMemberItem | string;
  originalIndex: number;
}

const normalizedMembers = computed<NormalizedMember[]>(() => {
  return props.members.map((m, index) => {
    if (typeof m === "string") {
      return {
        id: String(index),
        name: m,
        isCurrentUser: false,
        raw: m,
        originalIndex: index,
      };
    }
    return {
      id: m.id || String(index),
      name: m.name,
      isCurrentUser: Boolean(m.is_current_user),
      raw: m,
      originalIndex: index,
    };
  });
});

const handleSelect = (member: NormalizedMember) => {
  if (props.selectable) {
    emit("update:modelValue", member.id);
  }
};

const handleRemove = (member: NormalizedMember) => {
  if (props.removable && !member.isCurrentUser) {
    emit("remove", member.raw, member.originalIndex);
  }
};
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5 min-h-8">
    <!-- Бейдж создателя (если передан, например в AddGroupModal) -->
    <span
      v-if="creatorBadge"
      class="glass-pill inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-accent-start/8 text-text-accent border border-text-accent/30 select-none shrink-0"
    >
      {{ creatorBadge }}
    </span>

    <!-- Список чипсов участников -->
    <template v-for="m in normalizedMembers" :key="m.id">
      <!-- Интерактивная кнопка-чип (при selectable = true) -->
      <button
        v-if="selectable"
        type="button"
        class="glass-pill inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full max-w-32 shrink-0 transition-all cursor-pointer select-none a11y-focus"
        :class="[
          modelValue === m.id
            ? 'bg-accent-start/8 text-text-accent border border-accent-start/30 scale-105'
            : 'text-text-primary hover:bg-black/5',
        ]"
        :title="m.name"
        @click="handleSelect(m)"
      >
        <span class="truncate">{{ m.name }}</span>
        <span v-if="m.isCurrentUser" class="text-[11px] opacity-80 shrink-0">
          (Вы)
        </span>
      </button>

      <!-- Обычный чипс / чипс с удалением -->
      <span
        v-else
        class="glass-pill inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full max-w-32 shrink-0 transition-all select-none"
        :class="[
          m.isCurrentUser
            ? 'bg-accent-start/8 text-text-accent border border-accent-mid/30 font-semibold'
            : 'text-text-primary',
        ]"
        :title="m.name"
      >
        <span class="truncate">{{ m.name }}</span>
        <span v-if="m.isCurrentUser" class="text-[11px] opacity-80 shrink-0">
          (Вы)
        </span>

        <!-- Кнопка удаления (крестик) -->
        <button
          v-if="removable && !m.isCurrentUser"
          type="button"
          class="text-text-secondary hover:text-text-accent active:scale-90 transition-colors ml-0.5 p-0.5 rounded-full cursor-pointer shrink-0 a11y-focus"
          title="Удалить"
          aria-label="Удалить участника"
          @click.stop="handleRemove(m)"
        >
          <X class="size-3" />
        </button>
      </span>
    </template>

    <!-- Слот для дополнительных элементов (например, кнопки "+ Добавить" в [id].vue) -->
    <slot name="append" />
  </div>
</template>
